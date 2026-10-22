import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { NgModel } from '@angular/forms';

@Directive({
  selector: '[OnlyNumber][ngModel]',
  standalone: true
})
export class OnlyNumberDirective {
  @Input() config: numberValidationConfig;
  constructor(private el: ElementRef, private ngModel: NgModel) { }
  ngOnInit(): void {
    // console.log(this.config)
  }

  @HostListener('input', ['$event'])
  onInputChange(event: InputEvent) {
    const latestData = event.data;
    const initialValue = this.el.nativeElement.value;
    const regEx = this.getRegEx()
    this.el.nativeElement.value = initialValue.replace(regEx, '');
    this.ngModel.viewToModelUpdate(this.el.nativeElement.value);
    const dotCount = (this.el.nativeElement.value.match(/\./g) || []).length;
    const minusCount = (this.el.nativeElement.value.match(/\-/g) || []).length;
    if (dotCount > 1 && this.config?.isDecimal) {
      this.el.nativeElement.value = this.el.nativeElement.value.replace(/\.(?=[^.]*$)/g, '');
      this.ngModel.viewToModelUpdate(this.el.nativeElement.value)
    }
    if (minusCount && this.config?.isNegative) {
      if (!(initialValue[0] == '-' && minusCount == 1)) {
        if (dotCount > 1 && this.config?.isDecimal) {
          this.el.nativeElement.value = this.el.nativeElement.value.replace(/\.(?=[^.]*$)/g, '');
          this.ngModel.viewToModelUpdate(this.el.nativeElement.value)
        } else {
          this.el.nativeElement.value = this.el.nativeElement.value.replace(/[^0-9]/g, '');
          this.ngModel.viewToModelUpdate(this.el.nativeElement.value)
        }
      }
    }
    if (initialValue !== this.el.nativeElement.value) {
      event.stopPropagation();
    }
  }

  @HostListener('blur', ['$event'])
  onInputBlur(event: any) {
    if (this.el.nativeElement.value > this.config?.maxNumber) {
      this.el.nativeElement.value = this.config?.maxNumber;
      this.ngModel.viewToModelUpdate(this.config?.maxNumber);
    }
    if (this.el.nativeElement.value < this.config?.minNumber) {
      this.el.nativeElement.value = this.config?.minNumber;
      this.ngModel.viewToModelUpdate(this.config?.minNumber);
    }
  }

  getRegEx() {
    if (this.config?.isNegative && this.config?.isDecimal) {
      return /[^-0-9.]/g
    } else if (!this.config?.isNegative && this.config?.isDecimal) {
      return /[^0-9.]/g
    } else if (this.config?.isNegative) {
      return /[^-0-9]/g
    } else if (this.config?.isDecimal) {
      return /[^0-9.]/g
    } else {
      return /[^0-9]/g
    }
  }

}

export class numberValidationConfig {
  isDecimal?: boolean = false;
  maxNumber?: number;
  minNumber?: number;
  isNegative?: boolean = false;
}