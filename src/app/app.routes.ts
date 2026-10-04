import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // Public guest routes
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
    canActivate: [guestGuard],
  },

  // Authenticated shell layout
  {
    path: '',
    loadComponent: () =>
      import('./shared/layout/app-shell/app-shell.component').then(
        (m) => m.AppShellComponent
      ),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'metrics',
        loadComponent: () =>
          import('./features/metrics/metrics.component').then(
            (m) => m.MetricsComponent
          ),
      },
      {
        path: 'metrics/new',
        loadComponent: () =>
          import(
            './features/metrics/create-metric/create-metric.component'
          ).then((m) => m.CreateMetricComponent),
      },
      {
        path: 'metrics/:id/edit',
        loadComponent: () =>
          import(
            './features/metrics/edit-metric/edit-metric.component'
          ).then((m) => m.EditMetricComponent),
      },
      {
        path: 'records',
        loadComponent: () =>
          import('./features/records/records.component').then(
            (m) => m.RecordsComponent
          ),
      },
      {
        path: 'insights',
        loadComponent: () =>
          import('./features/insights/insights.component').then(
            (m) => m.InsightsComponent
          ),
      },
    ],
  },

  // Fallback
  {
    path: '**',
    redirectTo: '',
  },
];
