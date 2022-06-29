import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'pages/dashboard',
    loadChildren: () => import('./pages/dashboard/dashboard.module').then( m => m.DashboardModule)
  },
  {
    path: '',
    redirectTo: 'pages/dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
