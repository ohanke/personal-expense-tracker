const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const { prisma } = require('../utils/prisma');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const displayName = profile.displayName;
        const avatarUrl = profile.photos?.[0]?.value;
        // accessToken and refreshToken are provided by OAuth but not needed for basic user management

        let user = await prisma.user.findUnique({
          where: {
            provider_provider_user_id: {
              provider: 'google',
              provider_user_id: profile.id,
            },
          },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              provider: 'google',
              provider_user_id: profile.id,
              email,
              display_name: displayName,
              avatar_url: avatarUrl,
            },
          });
        } else {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              email,
              display_name: displayName,
              avatar_url: avatarUrl,
            },
          });
        }

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/github/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const displayName = profile.displayName || profile.username;
        const avatarUrl = profile.photos?.[0]?.value;
        // accessToken and refreshToken are provided by OAuth but not needed for basic user management

        let user = await prisma.user.findUnique({
          where: {
            provider_provider_user_id: {
              provider: 'github',
              provider_user_id: profile.id,
            },
          },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              provider: 'github',
              provider_user_id: profile.id,
              email,
              display_name: displayName,
              avatar_url: avatarUrl,
            },
          });
        } else {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              email,
              display_name: displayName,
              avatar_url: avatarUrl,
            },
          });
        }

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);

module.exports = passport;
