import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import * as userModel from '../models/userModel.js';
import authConfig from './auth.js';

export default function configurePassport() {
    passport.use(new GoogleStrategy({
        clientID: authConfig.oauth.google.clientID,
        clientSecret: authConfig.oauth.google.clientSecret,
        callbackURL: authConfig.oauth.google.callbackURL
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await userModel.findUserByProvider(profile.id, 'google');
            
            if (user) {
                delete user.password_hash;
                return done(null, user);
            }
            
            const email = profile.emails?.[0]?.value;
            if (!email) {
            }
            
            user = await userModel.createOAuthUser({
                username: profile.displayName || email.split('@')[0],
                email: email,
                providerId: profile.id,
                providerName: 'google'
            });
            
            delete user.password_hash;
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }));
    
    passport.use(new GitHubStrategy({
        clientID: authConfig.oauth.github.clientID,
        clientSecret: authConfig.oauth.github.clientSecret,
        callbackURL: authConfig.oauth.github.callbackURL,
        scope: ['user:email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await userModel.findUserByProvider(profile.id, 'github');
            
            if (user) {
                delete user.password_hash;
                return done(null, user);
            }
            
            const email = profile.emails?.[0]?.value;
            if (!email) {
                return done(new Error('Email required'));
            }
            
            user = await userModel.createOAuthUser({
                username: profile.username || profile.displayName,
                email: email,
                providerId: profile.id,
                providerName: 'github'
            });
            
            delete user.password_hash;
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }));
    
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });
    
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await userModel.findUserById(id);
            if (user) delete user.password_hash;
            done(null, user);
        } catch (error) {
            done(error);
        }
    });
}