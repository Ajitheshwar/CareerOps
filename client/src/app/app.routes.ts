import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'profile',
        pathMatch: 'full'
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/pages/profile/profile.component').then(m => m.UserProfileComponent),
        title: 'Profile & Resume | CareerOps AI'
      },
      {
        path: 'matches',
        loadComponent: () => import('./features/matches/pages/matches/matches.component').then(m => m.JobMatchesComponent),
        title: 'Target Matches | CareerOps AI'
      },
      {
        path: 'tailor',
        loadComponent: () => import('./features/tailor/pages/tailor/tailor.component').then(m => m.ResumeTailorComponent),
        title: 'Resume Customizer | CareerOps AI'
      },
      {
        path: 'coach',
        loadComponent: () => import('./features/coach/pages/coach/coach.component').then(m => m.InterviewCoachComponent),
        title: 'Interview Coach | CareerOps AI'
      },
      {
        path: 'mentor',
        loadComponent: () => import('./features/mentor/pages/mentor/mentor.component').then(m => m.MentorChatComponent),
        title: 'Career Mentor Chat | CareerOps AI'
      },
      {
        path: 'tracker',
        loadComponent: () => import('./features/tracker/pages/tracker/tracker.component').then(m => m.JobTrackerComponent),
        title: 'Application Pipeline | CareerOps AI'
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/analytics/pages/analytics/analytics.component').then(m => m.InterviewAnalyticsComponent),
        title: 'Interview Analytics | CareerOps AI'
      },
      {
        path: 'jobs/:id',
        loadComponent: () => import('./features/job-details/pages/job-details/job-details.component').then(m => m.JobDetailsComponent),
        title: 'Job Details | CareerOps AI'
      },
      {
        path: 'interview/dashboard',
        redirectTo: 'coach'
      },
      {
        path: 'interview/session/:id',
        loadComponent: () => import('./features/interview/pages/session/session.component').then(m => m.InterviewSessionComponent),
        title: 'Interview Session | CareerOps AI'
      }
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component').then(m => m.NotFoundComponent),
    title: '404 - Not Found | CareerOps AI'
  }
];
