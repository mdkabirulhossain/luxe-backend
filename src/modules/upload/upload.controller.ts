/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Request } from 'express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// Filter helper to ensure only images are accepted
const imageFileFilter = (req: any, file: Express.Multer.File, callback: any) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return callback(new BadRequestException('Only image files (jpg, jpeg, png, gif, webp, svg) are allowed!'), false);
  }
  callback(null, true);
};

// Filename generator helper
const editFileName = (req: any, file: Express.Multer.File, callback: any) => {
  const fileExtName = extname(file.originalname);
  const originalNameCleaned = file.originalname
    .replace(fileExtName, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  
  const randomHex = Array(8)
    .fill(null)
    .map(() => Math.round(Math.random() * 16).toString(16))
    .join('');
    
  callback(null, `${originalNameCleaned}-${Date.now()}-${randomHex}${fileExtName}`);
};

// Multer configurations
const multerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = './uploads';
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: editFileName,
  }),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
};

@ApiTags('Uploads')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('single')
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a single image file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'The image file to upload (JPEG, PNG, WEBP, GIF, SVG. Max 5MB)',
        },
      },
      required: ['image'],
    },
  })
  @ApiResponse({ status: 201, description: 'Image successfully uploaded.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Missing file or invalid format.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Authentication required.' })
  async uploadSingleFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    const url = this.uploadService.getFileUrl(req, file.filename);
    return { url };
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('images', 10, multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple image files (up to 10 files)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'List of image files to upload (JPEG, PNG, WEBP, GIF, SVG. Max 5MB each, up to 10 files)',
        },
      },
      required: ['images'],
    },
  })
  @ApiResponse({ status: 201, description: 'Images successfully uploaded.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Missing files or invalid formats.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[], @Req() req: any) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image file is required');
    }
    const urls = this.uploadService.getFilesUrls(req, files);
    return { urls };
  }
}
