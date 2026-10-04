import '@angular/compiler';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from '../guards/auth.guard';
import { guestGuard } from '../guards/guest.guard';

describe('AuthService & Auth Guards Lifecycle', () => {
  let injector: Injector;
  let authService: AuthService;
  let mockHttpClient: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn>; createUrlTree: ReturnType<typeof vi.fn> };
  let localStorageMock: Record<string, string> = {};

  beforeEach(() => {
    localStorageMock = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStorageMock[key] ?? null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageMock[key];
      },
      clear: () => {
        localStorageMock = {};
      },
    });

    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
    };

    mockRouter = {
      navigate: vi.fn(),
      createUrlTree: vi.fn((commands: any[]) => ({ tree: commands } as any)),
    };

    injector = Injector.create({
      providers: [
        { provide: AuthService },
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: Router, useValue: mockRouter },
      ],
    });

    authService = injector.get(AuthService);
  });

  it('should initialize as unauthenticated when no token exists in localStorage', async () => {
    expect(authService.hasToken()).toBe(false);

    const user = await authService.ensureInitialized();
    expect(user).toBeNull();
    expect(authService.currentUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.isInitialized()).toBe(true);
    expect(mockHttpClient.get).not.toHaveBeenCalled();
  });

  it('should restore user session when a valid token exists in localStorage', async () => {
    localStorageMock['glance_token'] = 'valid-jwt-token';
    const mockUser = { id: 'u1', email: 'test@example.com', createdAt: '', updatedAt: '' };

    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: { user: mockUser },
      })
    );

    const user = await authService.ensureInitialized();
    expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    expect(user).toEqual(mockUser);
    expect(authService.currentUser()).toEqual(mockUser);
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.isInitialized()).toBe(true);

    // Repeated calls should use cached promise/state without extra HTTP calls
    const cachedUser = await authService.ensureInitialized();
    expect(cachedUser).toEqual(mockUser);
    expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
  });

  it('should clear token and set unauthenticated when token is invalid or expired (401)', async () => {
    localStorageMock['glance_token'] = 'expired-jwt-token';

    mockHttpClient.get.mockReturnValue(
      throwError(() => ({
        status: 401,
        error: { statusCode: 401, message: 'Token has expired' },
      }))
    );

    const user = await authService.ensureInitialized();
    expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    expect(user).toBeNull();
    expect(authService.currentUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.isInitialized()).toBe(true);
    expect(localStorageMock['glance_token']).toBeUndefined();
  });

  it('authGuard should allow navigation if authenticated', async () => {
    localStorageMock['glance_token'] = 'valid-jwt-token';
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: { user: { id: 'u1', email: 'test@example.com', createdAt: '', updatedAt: '' } },
      })
    );

    const result = await runInInjectionContext(injector, () =>
      authGuard({} as any, {} as any)
    );

    expect(result).toBe(true);
  });

  it('authGuard should redirect to /login if unauthenticated', async () => {
    const result = await runInInjectionContext(injector, () =>
      authGuard({} as any, {} as any)
    );

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toEqual({ tree: ['/login'] });
  });

  it('guestGuard should redirect to /dashboard if already authenticated', async () => {
    localStorageMock['glance_token'] = 'valid-jwt-token';
    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: { user: { id: 'u1', email: 'test@example.com', createdAt: '', updatedAt: '' } },
      })
    );

    const result = await runInInjectionContext(injector, () =>
      guestGuard({} as any, {} as any)
    );

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    expect(result).toEqual({ tree: ['/dashboard'] });
  });

  it('guestGuard should allow navigation to /login or /register if unauthenticated', async () => {
    const result = await runInInjectionContext(injector, () =>
      guestGuard({} as any, {} as any)
    );

    expect(result).toBe(true);
  });

  it('login should store token, update currentUser, set initialized, and update isAuthenticated', () => {
    const mockUser = { id: 'u2', email: 'logged@example.com', createdAt: '', updatedAt: '' };
    mockHttpClient.post.mockReturnValue(
      of({
        statusCode: 200,
        message: 'Login successful',
        data: {
          accessToken: 'new-token-123',
          user: mockUser,
        },
      })
    );

    authService.login({ email: 'logged@example.com', password: 'password123' }).subscribe();

    expect(authService.getToken()).toBe('new-token-123');
    expect(authService.currentUser()).toEqual(mockUser);
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.isInitialized()).toBe(true);
  });

  it('logout should clear token, reset currentUser, and navigate to /login', () => {
    localStorageMock['glance_token'] = 'active-token';
    authService.logout();

    expect(localStorageMock['glance_token']).toBeUndefined();
    expect(authService.currentUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('concurrent calls to ensureInitialized should share the same HTTP request', async () => {
    localStorageMock['glance_token'] = 'valid-jwt-token';
    const mockUser = { id: 'u1', email: 'test@example.com', createdAt: '', updatedAt: '' };

    mockHttpClient.get.mockReturnValue(
      of({
        statusCode: 200,
        data: { user: mockUser },
      })
    );

    const [u1, u2, u3] = await Promise.all([
      authService.ensureInitialized(),
      authService.ensureInitialized(),
      authService.ensureInitialized(),
    ]);

    expect(u1).toEqual(mockUser);
    expect(u2).toEqual(mockUser);
    expect(u3).toEqual(mockUser);
    expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
  });
});
