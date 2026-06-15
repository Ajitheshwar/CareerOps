import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-agent-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agent-loader.component.html',
  styleUrls: ['./agent-loader.component.css']
})
export class AgentLoaderComponent {
  @Input() title: string = 'Agent is processing...';
  @Input() description: string = '';
}
