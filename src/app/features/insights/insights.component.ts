import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InsightService } from '../../core/services/insight.service';
import {
  InsightCategory,
  InsightDateRange,
  InsightEvidence,
  InsightItem,
  InsightResponseData,
  InsightType,
} from '../../core/models/insight.models';

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './insights.component.html',
  styleUrl: './insights.component.css',
})
export class InsightsComponent implements OnInit {
  private readonly insightService = inject(InsightService);

  readonly selectedDays = signal<number>(7);
  readonly insightData = signal<InsightResponseData | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadInsights(this.selectedDays());
  }

  loadInsights(days: number): void {
    this.selectedDays.set(days);
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.insightService.getInsights({ days }).subscribe({
      next: (res) => {
        this.insightData.set(res.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.status === 0
            ? 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง'
            : 'ไม่สามารถโหลดข้อมูลเชิงลึกได้ กรุณาลองใหม่อีกครั้ง'
        );
      },
    });
  }

  getCategoryLabel(category: InsightCategory): string {
    switch (category) {
      case 'positive':
        return 'เชิงบวก';
      case 'warning':
        return 'ข้อควรระวัง';
      case 'info':
        return 'ข้อมูลทั่วไป';
      default:
        return category;
    }
  }

  getCategoryBadgeClass(category: InsightCategory): string {
    switch (category) {
      case 'positive':
        return 'badge-positive';
      case 'warning':
        return 'badge-warning';
      case 'info':
        return 'badge-info';
      default:
        return 'badge-info';
    }
  }

  getTypeLabel(type: InsightType): string {
    switch (type) {
      case 'trend':
        return 'แนวโน้ม';
      case 'pattern':
        return 'รูปแบบ';
      case 'relationship':
        return 'ความสัมพันธ์';
      case 'goal_progress':
        return 'ความคืบหน้าเป้าหมาย';
      case 'suggestion':
        return 'คำแนะนำ';
      case 'info':
        return 'ข้อมูล';
      default:
        return type;
    }
  }

  getTypeIcon(type: InsightType): string {
    switch (type) {
      case 'trend':
        return '📈';
      case 'pattern':
        return '🔁';
      case 'relationship':
        return '🔗';
      case 'goal_progress':
        return '🎯';
      case 'suggestion':
        return '💡';
      case 'info':
        return 'ℹ️';
      default:
        return '✨';
    }
  }

  formatDateRange(dateRange: InsightDateRange | undefined): string {
    if (!dateRange?.startDate || !dateRange?.endDate) return '-';
    const s = new Date(dateRange.startDate);
    const e = new Date(dateRange.endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return '-';

    const shortMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];

    const sDay = s.getDate();
    const sMonth = shortMonths[s.getMonth()];
    const eDay = e.getDate();
    const eMonth = shortMonths[e.getMonth()];
    const eYearBE = e.getFullYear() + 543;

    return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${eYearBE} (${dateRange.days} วัน)`;
  }

  formatEvidence(evidence: InsightEvidence | undefined): { label: string; value: string }[] {
    if (!evidence || typeof evidence !== 'object') return [];

    const items: { label: string; value: string }[] = [];

    const dayNameMap: Record<string, string> = {
      Monday: 'วันจันทร์',
      Tuesday: 'วันอังคาร',
      Wednesday: 'วันพุธ',
      Thursday: 'วันพฤหัสบดี',
      Friday: 'วันศุกร์',
      Saturday: 'วันเสาร์',
      Sunday: 'วันอาทิตย์',
    };

    if (evidence['achievementRate'] !== undefined) {
      items.push({ label: 'อัตราความสำเร็จ', value: `${evidence['achievementRate']}%` });
    }
    if (evidence['daysMet'] !== undefined && evidence['totalRecordedDays'] !== undefined) {
      items.push({
        label: 'วันที่ถึงเป้าหมาย',
        value: `${evidence['daysMet']}/${evidence['totalRecordedDays']} วัน`,
      });
    }
    if (evidence['currentAverage'] !== undefined) {
      items.push({ label: 'ค่าเฉลี่ยปัจจุบัน', value: String(evidence['currentAverage']) });
    }
    if (evidence['target'] !== undefined) {
      items.push({ label: 'เป้าหมาย', value: String(evidence['target']) });
    }
    if (evidence['direction'] !== undefined) {
      const dir = String(evidence['direction']);
      const dirLabel =
        dir === 'increasing' ? 'เพิ่มขึ้น' : dir === 'decreasing' ? 'ลดลง' : 'คงที่';
      items.push({ label: 'ทิศทางแนวโน้ม', value: dirLabel });
    }
    if (evidence['percentageChange'] !== undefined) {
      const change = Number(evidence['percentageChange']);
      items.push({ label: 'การเปลี่ยนแปลง', value: `${change > 0 ? '+' : ''}${change}%` });
    }
    if (evidence['peakDay'] !== undefined) {
      const day = String(evidence['peakDay']);
      items.push({ label: 'วันที่มีกิจกรรมสูงสุด', value: dayNameMap[day] || day });
    }
    if (evidence['recordCount'] !== undefined) {
      items.push({ label: 'จำนวนบันทึก', value: `${evidence['recordCount']} ครั้ง` });
    }
    if (evidence['currentRecords'] !== undefined) {
      items.push({ label: 'บันทึกปัจจุบัน', value: `${evidence['currentRecords']} ครั้ง` });
    }
    if (evidence['minimumRecordsRequired'] !== undefined) {
      items.push({
        label: 'เกณฑ์วิเคราะห์ขั้นต่ำ',
        value: `${evidence['minimumRecordsRequired']} ครั้ง`,
      });
    }
    if (evidence['sharedDays'] !== undefined) {
      items.push({ label: 'วันที่บันทึกร่วมกัน', value: `${evidence['sharedDays']} วัน` });
    }

    return items;
  }

  isColdStart(insight: InsightItem): boolean {
    return insight.id === 'insight-cold-start';
  }

  isInsufficientData(insight: InsightItem): boolean {
    return insight.id === 'insight-insufficient-data';
  }
}
