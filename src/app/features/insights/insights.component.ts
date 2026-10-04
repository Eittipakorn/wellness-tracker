import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">ข้อมูลเชิงลึก</h1>
      <p class="page-description">วิเคราะห์แนวโน้ม ความสัมพันธ์ และรูปแบบพฤติกรรม</p>
    </div>
    <div class="placeholder-card">
      <div class="placeholder-icon">💡</div>
      <h2 class="placeholder-title">ข้อมูลเชิงลึกจากระบบ</h2>
      <p class="placeholder-text">หน้านี้จะแสดงแนวโน้ม ข้อเสนอแนะ และความคืบหน้าของเป้าหมาย</p>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 2rem; }
    .page-title { font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0 0 0.5rem 0; }
    .page-description { font-size: 0.9375rem; color: #64748b; margin: 0; }
    .placeholder-card {
      background-color: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 0.75rem;
      padding: 3rem 2rem;
      text-align: center;
      max-width: 600px;
      margin: 0 auto;
    }
    .placeholder-icon { font-size: 2.5rem; margin-bottom: 1rem; }
    .placeholder-title { font-size: 1.25rem; font-weight: 600; color: #1e293b; margin: 0 0 0.5rem 0; }
    .placeholder-text { font-size: 0.875rem; color: #64748b; line-height: 1.5; margin: 0; }
  `],
})
export class InsightsComponent {}
