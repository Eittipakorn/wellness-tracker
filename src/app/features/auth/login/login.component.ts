import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('registered') === 'true') {
      this.successMessage.set('สมัครสมาชิกเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ');
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getEmailError(): string {
    const control = this.loginForm.get('email');
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'กรุณากรอกอีเมล';
    if (control.errors['email']) return 'รูปแบบอีเมลไม่ถูกต้อง';
    return '';
  }

  getPasswordError(): string {
    const control = this.loginForm.get('password');
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'กรุณากรอกรหัสผ่าน';
    return '';
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;
    if (!email || !password) return;

    this.isLoading.set(true);

    this.authService
      .login({
        email: email.trim().toLowerCase(),
        password,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.status === 401) {
            this.errorMessage.set('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
          } else if (err.status === 0) {
            this.errorMessage.set('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
          } else if (err.status === 400) {
            this.errorMessage.set('ข้อมูลที่กรอกไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
          } else {
            this.errorMessage.set('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
          }
        },
      });
  }
}
