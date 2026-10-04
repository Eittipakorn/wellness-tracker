import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  if (password && confirmPassword && password !== confirmPassword) {
    return { passwordMismatch: true };
  }
  return null;
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly registerForm = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordMatchValidator] }
  );

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isConfirmPasswordInvalid(): boolean {
    const confirmField = this.registerForm.get('confirmPassword');
    const isTouched = !!(confirmField && (confirmField.dirty || confirmField.touched));
    const hasFieldError = !!(confirmField && confirmField.invalid);
    const hasMismatch = this.registerForm.hasError('passwordMismatch');
    return isTouched && (hasFieldError || hasMismatch);
  }

  getEmailError(): string {
    const control = this.registerForm.get('email');
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'กรุณากรอกอีเมล';
    if (control.errors['email']) return 'รูปแบบอีเมลไม่ถูกต้อง';
    return '';
  }

  getPasswordError(): string {
    const control = this.registerForm.get('password');
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'กรุณากรอกรหัสผ่าน';
    if (control.errors['minlength']) return 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
    return '';
  }

  getConfirmPasswordError(): string {
    const control = this.registerForm.get('confirmPassword');
    if (control?.errors?.['required']) return 'กรุณายืนยันรหัสผ่าน';
    if (this.registerForm.hasError('passwordMismatch')) {
      return 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
    }
    return '';
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.registerForm.value;
    if (!email || !password) return;

    this.isLoading.set(true);

    this.authService
      .register({
        email: email.trim().toLowerCase(),
        password,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/login'], {
            queryParams: { registered: 'true' },
          });
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.status === 409) {
            this.errorMessage.set('อีเมลนี้มีผู้ใช้งานแล้ว กรุณาใช้อีเมลอื่นหรือเข้าสู่ระบบ');
          } else if (err.status === 0) {
            this.errorMessage.set('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
          } else if (err.status === 400) {
            this.errorMessage.set('ข้อมูลที่กรอกไม่ถูกต้อง กรุณาตรวจสอบอีเมลและรหัสผ่าน');
          } else {
            this.errorMessage.set('เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่อีกครั้ง');
          }
        },
      });
  }
}
