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
        loadComponent: () => import('./features/profile/profile.component').then(m => m.UserProfileComponent),
        title: 'Profile & Resume | TalentGraph AI'
      },
      {
        path: 'matches',
        loadComponent: () => import('./features/matches/matches.component').then(m => m.JobMatchesComponent),
        title: 'Target Matches | TalentGraph AI'
      },
      {
        path: 'tailor',
        loadComponent: () => import('./features/tailor/tailor.component').then(m => m.ResumeTailorComponent),
        title: 'Resume Customizer | TalentGraph AI'
      },
      {
        path: 'coach',
        loadComponent: () => import('./features/coach/coach.component').then(m => m.InterviewCoachComponent),
        title: 'Interview Coach | TalentGraph AI'
      },
      {
        path: 'mentor',
        loadComponent: () => import('./features/mentor/mentor.component').then(m => m.MentorChatComponent),
        title: 'Career Mentor Chat | TalentGraph AI'
      },
      {
        path: 'tracker',
        loadComponent: () => import('./features/tracker/tracker.component').then(m => m.JobTrackerComponent),
        title: 'Application Pipeline | TalentGraph AI'
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/analytics/analytics.component').then(m => m.InterviewAnalyticsComponent),
        title: 'Interview Analytics | TalentGraph AI'
      },
      {
        path: 'jobs/:id',
        loadComponent: () => import('./features/job-details/job-details.component').then(m => m.JobDetailsComponent),
        title: 'Job Details | TalentGraph AI'
      }
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component').then(m => m.NotFoundComponent),
    title: '404 - Not Found | TalentGraph AI'
  }
];
