import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class UploadService {
  /**
   * Constructs the full, publicly accessible static URL for an uploaded file
   */
  getFileUrl(req: Request, filename: string): string {
    const protocol = req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}/uploads/${filename}`;
  }

  /**
   * Constructs list of static URLs for multiple files
   */
  getFilesUrls(req: Request, files: Express.Multer.File[]): string[] {
    return files.map((file) => this.getFileUrl(req, file.filename));
  }
}
