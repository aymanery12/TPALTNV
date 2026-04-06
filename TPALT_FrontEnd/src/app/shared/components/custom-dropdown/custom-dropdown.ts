import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';

export interface DropdownOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-custom-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-dropdown.html',
  styleUrl: './custom-dropdown.scss'
})
export class CustomDropdownComponent implements OnInit, OnDestroy {
  @Input() options: DropdownOption[] = [];
  @Input() value = '';
  @Input() placeholder = 'Choisir';
  @Input() minWidth = '150px';
  @Input() disabled = false;
  @Input() fullWidth = false;

  @Output() valueChange = new EventEmitter<string>();

  open = false;
  private readonly onDocumentClickCapture = (event: Event): void => {
    const target = event.target as Node | null;
    if (target && !this.hostElement.nativeElement.contains(target)) {
      this.open = false;
    }
  };

  constructor(private hostElement: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    document.addEventListener('click', this.onDocumentClickCapture, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.onDocumentClickCapture, true);
  }

  get selectedLabel(): string {
    return this.options.find(option => option.value === this.value)?.label ?? this.placeholder;
  }

  toggle(): void {
    if (this.disabled) {
      return;
    }
    this.open = !this.open;
  }

  selectOption(value: string): void {
    this.valueChange.emit(value);
    this.open = false;
  }

}
