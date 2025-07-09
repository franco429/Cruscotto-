import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import request from 'supertest';
import { setupAuth, hashPassword, comparePasswords } from '../auth';
import { mongoStorage } from '../mongo-storage';
import { EventEmitter } from 'events';

// Mock delle dipendenze
vi.mock('../mongo-storage', () => {
  class SessionStoreMock extends EventEmitter {
    get = vi.fn();
    set = vi.fn();
    destroy = vi.fn();
    all = vi.fn();
    length = vi.fn();
    clear = vi.fn();
    touch = vi.fn();
  }
  return {
    mongoStorage: {
      getUserByEmail: vi.fn(),
      resetLoginAttempts: vi.fn(),
      recordFailedLoginAttempt: vi.fn(),
      getUser: vi.fn(),
      updateUserSession: vi.fn(),
      createLog: vi.fn(),
      getClient: vi.fn(),
      sessionStore: new SessionStoreMock(),
    }
  };
});

vi.mock('../google-drive', () => ({
  startAutomaticSync: vi.fn()
}));
