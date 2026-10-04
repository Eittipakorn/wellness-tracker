import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MetricService } from '../../core/services/metric.service';
import { Metric, MetricType } from '../../core/models/metric.models';

@Component({
  selector: 'app-metrics',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './metrics.component.html',
  styleUrl: './metrics.component.css',
})
export class MetricsComponent implements OnInit {
  private readonly metricService = inject(MetricService);
  private readonly route = inject(ActivatedRoute);

  readonly metrics = signal<Metric[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly deletingMetricId = signal<string | null>(null);
  readonly togglingMetricId = signal<string | null>(null);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('created') === 'true') {
      this.successMessage.set('สร้างตัวชี้วัดเรียบร้อยแล้ว');
    } else if (params.get('edited') === 'true') {
      this.successMessage.set('แก้ไขตัวชี้วัดเรียบร้อยแล้ว');
    }
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.metricService.getMetrics().subscribe({
      next: (res) => {
        this.metrics.set(res.data.metrics);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('ไม่สามารถโหลดข้อมูลตัวชี้วัดได้ กรุณาลองใหม่อีกครั้ง');
        this.isLoading.set(false);
      },
    });
  }

  onDelete(metric: Metric): void {
    const isBrowser = typeof window !== 'undefined';
    const confirmed = isBrowser
      ? window.confirm(
          `ต้องการลบตัวชี้วัด "${metric.name}" ใช่หรือไม่?\nการลบข้อมูลนี้ไม่สามารถย้อนกลับได้`
        )
      : true;
    if (!confirmed) return;

    this.deletingMetricId.set(metric.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.metricService.deleteMetric(metric.id).subscribe({
      next: () => {
        this.metrics.update((list) => list.filter((m) => m.id !== metric.id));
        this.successMessage.set('ลบตัวชี้วัดเรียบร้อยแล้ว');
        this.deletingMetricId.set(null);
      },
      error: () => {
        this.errorMessage.set('ไม่สามารถลบตัวชี้วัดได้ กรุณาลองใหม่อีกครั้ง');
        this.deletingMetricId.set(null);
      },
    });
  }

  onToggleActive(metric: Metric): void {
    this.togglingMetricId.set(metric.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const newStatus = !metric.isActive;

    this.metricService.updateMetric(metric.id, { isActive: newStatus }).subscribe({
      next: (res) => {
        this.metrics.update((list) =>
          list.map((m) => (m.id === metric.id ? res.data.metric : m))
        );
        this.successMessage.set('เปลี่ยนสถานะตัวชี้วัดเรียบร้อยแล้ว');
        this.togglingMetricId.set(null);
      },
      error: () => {
        this.errorMessage.set('ไม่สามารถเปลี่ยนสถานะตัวชี้วัดได้ กรุณาลองใหม่อีกครั้ง');
        this.togglingMetricId.set(null);
      },
    });
  }

  getMetricTypeLabel(type: MetricType): string {
    switch (type) {
      case 'BOOLEAN':
        return 'เช็ก / ไม่เช็ก';
      case 'NUMBER':
        return 'ตัวเลข';
      case 'RATING':
        return 'คะแนน';
      case 'SINGLE_SELECT':
        return 'เลือกหนึ่งรายการ';
      case 'MULTIPLE_SELECT':
        return 'เลือกได้หลายรายการ';
      case 'TEXT':
        return 'ข้อความ';
      default:
        return type;
    }
  }

  getTypeBadgeClass(type: MetricType): string {
    switch (type) {
      case 'BOOLEAN':
        return 'badge-boolean';
      case 'NUMBER':
        return 'badge-number';
      case 'RATING':
        return 'badge-rating';
      case 'SINGLE_SELECT':
        return 'badge-single-select';
      case 'MULTIPLE_SELECT':
        return 'badge-multi-select';
      case 'TEXT':
        return 'badge-text';
      default:
        return 'badge-default';
    }
  }
}
