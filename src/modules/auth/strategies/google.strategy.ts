import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_client_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { name, emails, photos, displayName } = profile;
    const givenName = name?.givenName || '';
    const familyName = name?.familyName || '';
    const user = {
      email: emails && emails.length > 0 ? emails[0].value : '',
      name: `${givenName} ${familyName}`.trim() || displayName || 'Google User',
      picture: photos && photos.length > 0 ? photos[0].value : null,
      accessToken,
    };
    done(null, user);
  }
}

