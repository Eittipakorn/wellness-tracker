import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  firstValueFrom,
  from,
  map,
  of,
  tap,
} from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { ApiResponse } from '../models/api.models';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  UserContainer,
} from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenKey = 'glance_token';

  private readonly _currentUser = signal<User | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isInitialized = signal<boolean>(false);

  private initPromise: Promise<User | null> | null = null;

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly isLoading = this._isLoading.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();

  getToken(): string | null {
    try {
      return localStorage.getItem(this.tokenKey);
    } catch {
      return null;
    }
  }

  setToken(token: string): void {
    try {
      localStorage.setItem(this.tokenKey, token);
    } catch {
      // Storage access may fail in certain environments
    }
  }

  clearToken(): void {
    try {
      localStorage.removeItem(this.tokenKey);
    } catch {
      // Storage access may fail in certain environments
    }
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  register(payload: RegisterRequest): Observable<ApiResponse<UserContainer>> {
    return this.http.post<ApiResponse<UserContainer>>(
      `${API_CONFIG.baseUrl}${API_CONFIG.auth.register}`,
      payload
    );
  }

  login(payload: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http
      .post<ApiResponse<AuthResponse>>(
        `${API_CONFIG.baseUrl}${API_CONFIG.auth.login}`,
        payload
      )
      .pipe(
        tap((res) => {
          this.setToken(res.data.accessToken);
          this._currentUser.set(res.data.user);
          this._isInitialized.set(true);
          this.initPromise = Promise.resolve(res.data.user);
        })
      );
  }

  getMe(): Observable<ApiResponse<UserContainer>> {
    return this.http
      .get<ApiResponse<UserContainer>>(
        `${API_CONFIG.baseUrl}${API_CONFIG.auth.me}`
      )
      .pipe(
        tap((res) => {
          this._currentUser.set(res.data.user);
        })
      );
  }

  private doRestore(): Promise<User | null> {
    if (!this.hasToken()) {
      this._currentUser.set(null);
      this._isInitialized.set(true);
      return Promise.resolve(null);
    }

    this._isLoading.set(true);
    return firstValueFrom(
      this.getMe().pipe(
        map((res) => res.data.user),
        catchError(() => {
          this.clearToken();
          this._currentUser.set(null);
          return of(null);
        }),
        finalize(() => {
          this._isLoading.set(false);
          this._isInitialized.set(true);
        })
      )
    ).catch(() => null);
  }

  ensureInitialized(): Promise<User | null> {
    if (this._isInitialized()) {
      return Promise.resolve(this._currentUser());
    }

    if (!this.initPromise) {
      this.initPromise = this.doRestore();
    }

    return this.initPromise;
  }

  restoreUser(): Observable<User | null> {
    this.initPromise = this.doRestore();
    return from(this.initPromise);
  }

  logout(): void {
    this.clearToken();
    this._currentUser.set(null);
    this._isInitialized.set(true);
    this.initPromise = Promise.resolve(null);
    this.router.navigate(['/login']);
  }
}
