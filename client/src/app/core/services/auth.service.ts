import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Simple signal-based authentication state for enterprise standard
  private _isAuthenticated = signal<boolean>(true); // Default to true so user is logged in

  isAuthenticated() {
    return this._isAuthenticated();
  }

  login() {
    this._isAuthenticated.set(true);
  }

  logout() {
    this._isAuthenticated.set(false);
  }
}
