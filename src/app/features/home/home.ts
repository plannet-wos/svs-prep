import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {}
