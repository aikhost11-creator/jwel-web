import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-view-content',
  templateUrl: './view-content.component.html',
  styleUrl: './view-content.component.scss'
})
export class ViewContentComponent {
  @Input() data;

  constructor(public activeModal : NgbActiveModal){}
}