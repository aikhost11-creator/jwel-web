import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-view-image',
  templateUrl: './view-image.component.html',
  styleUrl: './view-image.component.scss'
})
export class ViewImageComponent {
  @Input() data;

  constructor(public activeModal : NgbActiveModal){}

}
