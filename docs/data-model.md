# Glance Data Model

## 1. Overview

เอกสารฉบับนี้อธิบายโครงสร้างข้อมูลหลักของระบบ Glance สำหรับ MVP โดยออกแบบให้สอดคล้องกับ Glance Requirements Specification และเน้นโครงสร้างที่เรียบง่าย สามารถนำไปพัฒนาระบบจริงและอธิบายในรายงานโครงงานได้อย่างชัดเจน

Glance เป็นระบบติดตามข้อมูลส่วนบุคคลที่เปิดให้ผู้ใช้งานกำหนด Metric ที่ต้องการติดตามด้วยตนเอง เช่น น้ำหนัก ระดับความเครียด การออกกำลังกาย ระยะเวลาการทำสมาธิ หรือข้อมูลอื่นที่เกี่ยวข้องกับสิ่งที่ผู้ใช้งานต้องการสังเกต

ใน MVP ระบบใช้หนึ่ง Account ต่อผู้ใช้งานหนึ่งราย โดย Metric ทั้งหมดของผู้ใช้งานอยู่ภายใต้ Account เดียว และไม่มีการแบ่งข้อมูลออกเป็นหลาย Profile

---

## 2. Design Principles

Data Model ของ Glance MVP ใช้หลักการดังต่อไปนี้

1. ผู้ใช้งานหนึ่งคนมีหนึ่ง Account
2. Account หนึ่งรายการสามารถมี Metric ได้หลายรายการ
3. Metric สามารถจัดอยู่ใน Group ได้ไม่เกินหนึ่ง Group หรือไม่อยู่ใน Group ใดเลย
4. Metric รองรับ 6 ประเภท ได้แก่ Boolean, Number, Rating, Single Select, Multiple Select และ Text
5. Metric ประเภท Single Select และ Multiple Select สามารถมี Metric Option ได้หลายรายการ
6. Metric หนึ่งรายการสามารถมี Metric Record ได้หลายรายการ รวมถึงสามารถมีหลาย Record ภายในวันเดียวกัน
7. Metric Record เก็บเวลาที่ข้อมูลเกิดขึ้นจริงแยกจากเวลาที่ข้อมูลถูกสร้างในระบบ
8. ผู้ใช้งานสามารถเปิดหรือปิดใช้งาน Metric ได้โดยไม่ต้องลบข้อมูลเดิม
9. ผู้ใช้งานสามารถกำหนด Goal ให้กับ Metric ที่ระบบรองรับการตั้งเป้าหมายได้
10. ผลลัพธ์จาก AI Analysis จะไม่ถูกจัดเก็บเป็น Entity แยกใน MVP แต่จะถูกสร้างจากข้อมูล Metric, Metric Record และ Goal เมื่อระบบต้องการวิเคราะห์หรือแสดงผล
11. Data Model เน้นความเรียบง่ายสำหรับ MVP และหลีกเลี่ยงโครงสร้างที่ยังไม่จำเป็น เช่น Multiple Profile, Formula Metric, Relation Metric, Rollup Metric และ Derived Metric

---

## 3. Entities

### 3.1 Account

Account ใช้เก็บข้อมูลบัญชีผู้ใช้งานและเป็นเจ้าของข้อมูลทั้งหมดที่เกี่ยวข้องกับผู้ใช้งาน

| Field        | Type     | Required | Description                                                           |
| ------------ | -------- | -------- | --------------------------------------------------------------------- |
| id           | UUID     | Yes      | รหัสประจำ Account                                                     |
| email        | String   | Yes      | อีเมลสำหรับสมัครสมาชิกและเข้าสู่ระบบ                                  |
| passwordHash | String   | Yes      | รหัสผ่านที่ผ่านกระบวนการ Hash และไม่สามารถเรียกคืนเป็นรหัสผ่านเดิมได้ |
| createdAt    | DateTime | Yes      | วันที่และเวลาที่สร้าง Account                                         |
| updatedAt    | DateTime | Yes      | วันที่และเวลาที่แก้ไข Account ล่าสุด                                  |

### Constraints

- `email` ต้องไม่ซ้ำกันในระบบ
- ระบบต้องไม่จัดเก็บรหัสผ่านในรูปแบบ Plain Text
- Account สามารถเข้าถึงได้เฉพาะโดยผู้ใช้งานที่ผ่านการยืนยันตัวตนของ Account นั้น

---

### 3.2 Group

Group ใช้สำหรับจัดกลุ่ม Metric เพื่อช่วยให้ผู้ใช้งานจัดระเบียบรายการติดตาม

Group ทำงานในลักษณะคล้าย Folder ไม่ใช่ Tag ดังนั้น Metric หนึ่งรายการสามารถอยู่ได้ไม่เกินหนึ่ง Group

| Field     | Type     | Required | Description                        |
| --------- | -------- | -------- | ---------------------------------- |
| id        | UUID     | Yes      | รหัสประจำ Group                    |
| accountId | UUID     | Yes      | Account เจ้าของ Group              |
| name      | String   | Yes      | ชื่อ Group                         |
| createdAt | DateTime | Yes      | วันที่และเวลาที่สร้าง Group        |
| updatedAt | DateTime | Yes      | วันที่และเวลาที่แก้ไข Group ล่าสุด |

### Relationships

- Account 1:N Group
- Group 1:N Metric
- Metric สามารถไม่มี Group ได้

### Constraints

- ชื่อ Group ต้องไม่ซ้ำกันภายใน Account เดียวกัน
- Group ของ Account หนึ่งต้องไม่สามารถอ้างอิง Metric ของ Account อื่นได้

### Delete Behavior

เมื่อลบ Group ระบบต้องไม่ลบ Metric ที่อยู่ภายใน Group นั้น แต่ต้องกำหนด `groupId` ของ Metric เหล่านั้นเป็น `NULL`

---

### 3.3 Metric

Metric คือรายการข้อมูลที่ผู้ใช้งานต้องการติดตาม

ตัวอย่าง:

- Weight
- Stress Level
- Energy Level
- Exercise
- Meditation
- Reading Time

| Field       | Type     | Required | Description                         |
| ----------- | -------- | -------- | ----------------------------------- |
| id          | UUID     | Yes      | รหัสประจำ Metric                    |
| accountId   | UUID     | Yes      | Account เจ้าของ Metric              |
| groupId     | UUID     | No       | Group ที่ Metric อยู่               |
| name        | String   | Yes      | ชื่อ Metric                         |
| description | String   | No       | คำอธิบาย Metric                     |
| type        | Enum     | Yes      | ประเภทของ Metric                    |
| unit        | String   | No       | หน่วยของ Metric ประเภท Number       |
| ratingMin   | Number   | No       | ค่าต่ำสุดของ Metric ประเภท Rating   |
| ratingMax   | Number   | No       | ค่าสูงสุดของ Metric ประเภท Rating   |
| isActive    | Boolean  | Yes      | สถานะเปิดหรือปิดใช้งาน Metric       |
| createdAt   | DateTime | Yes      | วันที่และเวลาที่สร้าง Metric        |
| updatedAt   | DateTime | Yes      | วันที่และเวลาที่แก้ไข Metric ล่าสุด |

### Metric Types

ระบบรองรับ Metric จำนวน 6 ประเภท

#### Boolean

ใช้สำหรับข้อมูลที่มีสองสถานะ เช่น

- Exercise → Yes / No
- Took Medication → Yes / No

#### Number

ใช้สำหรับค่าตัวเลข รองรับทั้งจำนวนเต็มและทศนิยม เช่น

- Weight → 68.5 kg
- Meditation → 30 min
- Water Intake → 2.25 L

ใน MVP หน้าจอบันทึกข้อมูลจะรองรับค่าทศนิยมไม่เกิน 2 ตำแหน่ง

Metric ประเภท Number สามารถกำหนด `unit` ได้ โดยผู้ใช้งานสามารถระบุหน่วยด้วยตนเอง เช่น `kg`, `min`, `km` หรือ `L`

#### Rating

ใช้สำหรับข้อมูลที่ผู้ใช้งานประเมินตามช่วงคะแนน เช่น

- Stress → 1 ถึง 10
- Energy → 1 ถึง 5

ผู้ใช้งานสามารถกำหนด `ratingMin` และ `ratingMax` ได้

กฎ:

```text
ratingMin < ratingMax
```

#### Single Select

ใช้สำหรับเลือกหนึ่งตัวเลือกจากรายการที่กำหนด เช่น

Mood:

- Happy
- Neutral
- Sad

ตัวเลือกจะถูกจัดเก็บใน Metric Option

#### Multiple Select

ใช้สำหรับเลือกได้มากกว่าหนึ่งตัวเลือก เช่น

Symptoms:

- Headache
- Fatigue
- Sore Throat
- Cough

ตัวเลือกจะถูกจัดเก็บใน Metric Option

#### Text

ใช้สำหรับข้อมูลข้อความ เช่น

- Journal
- Daily Reflection
- Notes

### Constraints

- ชื่อ Metric ต้องไม่ซ้ำกันภายใน Account เดียวกัน
- `unit` ใช้กับ Metric ประเภท Number ใน MVP
- `ratingMin` และ `ratingMax` ใช้เฉพาะ Metric ประเภท Rating
- Metric ประเภท Rating ต้องมี `ratingMin < ratingMax`
- Metric ประเภท Single Select และ Multiple Select สามารถมี Metric Option ได้
- ค่าเริ่มต้นของ `isActive` ควรเป็น `true`

### Active / Inactive Behavior

การปิดใช้งาน Metric ไม่ถือเป็นการลบ Metric

เมื่อ Metric ถูกตั้งค่าเป็น Inactive:

- Metric และ Record เดิมยังคงอยู่ในระบบ
- ผู้ใช้งานยังสามารถดูข้อมูลย้อนหลังได้
- Metric ไม่จำเป็นต้องแสดงในรายการสำหรับบันทึกข้อมูลตามปกติ
- ผู้ใช้งานสามารถเปิดใช้งาน Metric กลับมาได้ภายหลัง

---

### 3.4 Metric Option

Metric Option ใช้เก็บตัวเลือกสำหรับ Metric ประเภท Single Select และ Multiple Select

| Field     | Type     | Required | Description                         |
| --------- | -------- | -------- | ----------------------------------- |
| id        | UUID     | Yes      | รหัสประจำ Option                    |
| metricId  | UUID     | Yes      | Metric ที่ Option นี้อยู่ภายใต้     |
| label     | String   | Yes      | ข้อความของตัวเลือก                  |
| sortOrder | Integer  | Yes      | ลำดับการแสดงตัวเลือก                |
| createdAt | DateTime | Yes      | วันที่และเวลาที่สร้าง Option        |
| updatedAt | DateTime | Yes      | วันที่และเวลาที่แก้ไข Option ล่าสุด |

### Relationships

- Metric 1:N Metric Option

### Constraints

- Metric Option ใช้ได้เฉพาะกับ Metric ประเภท Single Select และ Multiple Select
- `label` ต้องไม่ซ้ำกันภายใน Metric เดียวกัน
- `sortOrder` ใช้สำหรับควบคุมลำดับการแสดงผล
- Data Model ของ MVP ไม่กำหนดจำนวนสูงสุดของ Metric Option

UI สามารถแนะนำไม่ให้ผู้ใช้งานสร้างตัวเลือกจำนวนมากเกินความจำเป็น แต่ไม่จำเป็นต้องกำหนด Hard Limit ในระดับ Database

---

### 3.5 Metric Record

Metric Record คือข้อมูลที่ผู้ใช้งานบันทึกสำหรับ Metric แต่ละรายการ

Metric หนึ่งรายการสามารถมี Metric Record ได้หลายรายการ และสามารถมีมากกว่าหนึ่ง Record ภายในวันเดียวกัน

ตัวอย่าง:

```text
Metric: Meditation

09:00 → 5 min
14:00 → 10 min
20:00 → 15 min
```

| Field      | Type     | Required | Description                                     |
| ---------- | -------- | -------- | ----------------------------------------------- |
| id         | UUID     | Yes      | รหัสประจำ Record                                |
| metricId   | UUID     | Yes      | Metric ที่ Record นี้เป็นของ                    |
| value      | JSONB    | Yes      | ค่าที่บันทึกตามประเภทของ Metric                 |
| note       | String   | No       | หมายเหตุเพิ่มเติมของ Record                     |
| recordedAt | DateTime | Yes      | วันที่และเวลาที่ข้อมูลเกิดขึ้นหรือผู้ใช้งานระบุ |
| createdAt  | DateTime | Yes      | วันที่และเวลาที่ Record ถูกสร้างในระบบ          |
| updatedAt  | DateTime | Yes      | วันที่และเวลาที่ Record ถูกแก้ไขล่าสุด          |

### Relationships

- Metric 1:N Metric Record

### Value Structure

`value` ใช้ JSONB เพื่อรองรับโครงสร้างค่าที่แตกต่างกันตาม Metric Type

#### Boolean

```json
{
  "value": true
}
```

#### Number

```json
{
  "value": 68.5
}
```

#### Rating

```json
{
  "value": 7
}
```

#### Single Select

```json
{
  "optionId": "OPTION_UUID"
}
```

#### Multiple Select

```json
{
  "optionIds": ["OPTION_UUID_1", "OPTION_UUID_2"]
}
```

#### Text

```json
{
  "value": "วันนี้รู้สึกมีพลังงานมากขึ้น"
}
```

### Record Time

`recordedAt` หมายถึงวันที่และเวลาของข้อมูลที่ผู้ใช้งานต้องการบันทึก ไม่ใช่วันที่และเวลาที่ข้อมูลถูก Insert เข้า Database

ตัวอย่าง:

ผู้ใช้งานอาจสร้าง Record ในวันที่ 3 ตุลาคม แต่ระบุว่าเหตุการณ์เกิดขึ้นวันที่ 1 ตุลาคม

```text
recordedAt = 2026-10-01 20:00
createdAt  = 2026-10-03 14:20
```

ดังนั้นระบบสามารถรองรับการบันทึกข้อมูลย้อนหลังได้

ระบบต้องไม่อนุญาตให้ `recordedAt` อยู่ในอนาคตตาม Business Rule ของ MVP

### DateTime Metric Clarification

`recordedAt` ไม่ถือเป็น Metric ประเภท DateTime

DateTime Metric หมายถึง Metric ที่ค่าหลักของ Metric เป็นวันและเวลา เช่น

```text
Metric: Bedtime
Type: DateTime
Value: 22:30
```

Metric ประเภทดังกล่าวอยู่นอกขอบเขต MVP

ในทางตรงกันข้าม `recordedAt` เป็น Metadata ที่บอกว่า Record แต่ละรายการเกิดขึ้นเมื่อใด และจำเป็นสำหรับ Metric ทุกประเภท

### Multiple Records Per Day

Database ต้องไม่กำหนด Unique Constraint ในรูปแบบ:

```text
(metricId, date)
```

เนื่องจากระบบต้องรองรับ Record หลายรายการของ Metric เดียวกันภายในหนึ่งวัน

กฎนี้ใช้กับ Metric ทุกประเภท รวมถึง Boolean

หาก UX บางส่วนต้องการจำกัด Metric บางรายการให้บันทึกได้เพียงครั้งเดียวต่อวัน กฎดังกล่าวควรถูกจัดการใน Application หรือ Business Logic ไม่ใช่ข้อจำกัดของ Data Model

### Record Note

`note` เป็นข้อมูลเสริมที่ไม่บังคับให้กรอก

ตัวอย่าง:

```text
Metric: Stress
Value: 8
Note: "วันนี้มีงานด่วนเข้ามาหลายงาน"
```

หมายเหตุสามารถใช้เป็น Context เพิ่มเติมในการวิเคราะห์ข้อมูลด้วย AI ได้

---

### 3.6 Goal

Goal คือเป้าหมายที่ผู้ใช้งานกำหนดสำหรับ Metric เพื่อใช้ติดตามความคืบหน้าและเปรียบเทียบกับข้อมูลที่บันทึกไว้

ตัวอย่าง:

```text
Meditation >= 30 minutes per day
Exercise >= 3 times per week
```

| Field       | Type     | Required | Description                       |
| ----------- | -------- | -------- | --------------------------------- |
| id          | UUID     | Yes      | รหัสประจำ Goal                    |
| accountId   | UUID     | Yes      | Account เจ้าของ Goal              |
| metricId    | UUID     | Yes      | Metric ที่ Goal อ้างอิง           |
| name        | String   | Yes      | ชื่อ Goal                         |
| targetValue | JSONB    | Yes      | ค่าเป้าหมาย                       |
| operator    | Enum     | Yes      | เงื่อนไขในการเปรียบเทียบค่า       |
| period      | Enum     | Yes      | ช่วงเวลาที่ใช้ประเมิน Goal        |
| createdAt   | DateTime | Yes      | วันที่และเวลาที่สร้าง Goal        |
| updatedAt   | DateTime | Yes      | วันที่และเวลาที่แก้ไข Goal ล่าสุด |

### Relationships

- Account 1:N Goal
- Metric 1:N Goal

### Operator

ตัวอย่าง Operator ที่สามารถรองรับได้ ได้แก่

```text
>=
<=
=
```

รูปแบบ Operator ที่อนุญาตจริงสามารถกำหนดเพิ่มเติมตาม Metric Type และรูปแบบ Goal ที่รองรับใน MVP

### Period

ตัวอย่างช่วงเวลาของ Goal:

```text
daily
weekly
```

ตัวอย่าง:

```text
Goal: Meditate at least 30 minutes per day

Metric: Meditation
targetValue: 30
operator: >=
period: daily
```

```text
Goal: Exercise at least 3 times per week

Metric: Exercise
targetValue: 3
operator: >=
period: weekly
```

### Goal Support by Metric Type

Goal ไม่จำเป็นต้องรองรับ Metric ทุกประเภทในรูปแบบเดียวกัน

ตัวอย่างเช่น Metric ประเภท Number และ Rating สามารถเปรียบเทียบค่ากับ Target ได้โดยตรง ในขณะที่ Text หรือ Multiple Select อาจต้องใช้กฎการประเมินที่แตกต่างออกไป

ดังนั้น Application Logic ต้องตรวจสอบว่า Goal รูปแบบใดสามารถใช้งานกับ Metric Type ใดได้

สำหรับ MVP ควรจำกัดรูปแบบ Goal ให้เฉพาะกรณีที่สามารถประเมินผลได้อย่างชัดเจนจาก Metric Record

### Constraints

- Goal ต้องเป็นของ Account เดียวกับ Metric ที่อ้างอิง
- Goal ต้องอ้างอิง Metric ที่มีอยู่จริง
- รูปแบบของ `targetValue` ต้องสอดคล้องกับ Goal และ Metric Type
- การลบ Goal ไม่ส่งผลให้ Metric หรือ Metric Record ถูกลบ

---

## 4. Entity Relationships

ภาพรวมความสัมพันธ์หลักของระบบ:

```text
Account
│
├── 1:N ── Group
│           │
│           └── 1:N ── Metric
│
├── 1:N ── Metric
│           │
│           ├── 1:N ── MetricOption
│           │
│           ├── 1:N ── MetricRecord
│           │
│           └── 1:N ── Goal
│
└── 1:N ── Goal
```

รายละเอียด:

```text
Account 1 ─────── N Group

Account 1 ─────── N Metric

Group   1 ─────── N Metric
                    ^
                    |
                optional
              from Metric

Metric  1 ─────── N MetricOption

Metric  1 ─────── N MetricRecord

Account 1 ─────── N Goal

Metric  1 ─────── N Goal
```

Metric สามารถไม่มี Group ได้ ดังนั้น `groupId` เป็น Nullable Foreign Key

---

## 5. Data Constraints and Business Rules

### 5.1 Account

- Email ต้องไม่ซ้ำกันในระบบ
- Password ต้องจัดเก็บเป็น Password Hash
- ข้อมูลของ Account ต้องไม่สามารถเข้าถึงผ่าน Account อื่นได้

### 5.2 Group

- Group ต้องเป็นของ Account
- ชื่อ Group ต้องไม่ซ้ำกันภายใน Account
- Metric สามารถอยู่ใน Group ได้ไม่เกินหนึ่ง Group
- Metric สามารถไม่มี Group ได้

### 5.3 Metric

- Metric ต้องเป็นของ Account
- ชื่อ Metric ต้องไม่ซ้ำกันภายใน Account
- Metric Type ต้องเป็นหนึ่งใน 6 ประเภทที่ระบบรองรับ
- Number สามารถกำหนด Unit ได้
- Number รองรับทศนิยมสูงสุด 2 ตำแหน่งใน MVP UI
- Rating ต้องกำหนด Min และ Max โดย Min ต้องน้อยกว่า Max
- Select Metrics สามารถมี Metric Option ได้
- Metric สามารถเปิดหรือปิดใช้งานได้โดยไม่ลบข้อมูลเดิม

### 5.4 Metric Option

- Metric Option ต้องเป็นของ Metric ประเภท Single Select หรือ Multiple Select
- Label ต้องไม่ซ้ำภายใน Metric เดียวกัน
- ระบบไม่กำหนดจำนวนสูงสุดของ Option ในระดับ Data Model

### 5.5 Metric Record

- Record ต้องอ้างอิง Metric ที่มีอยู่
- Record หลายรายการสามารถอ้างอิง Metric เดียวกันในวันเดียวกันได้
- Record สามารถถูกแก้ไขและลบได้
- `recordedAt` สามารถเป็นอดีตหรือเวลาปัจจุบันได้
- `recordedAt` ต้องไม่อยู่ในอนาคต
- `note` เป็นข้อมูลที่ไม่บังคับ
- รูปแบบของ `value` ต้องสอดคล้องกับ Metric Type

### 5.6 Goal

- Goal ต้องเป็นของ Account
- Goal ต้องอ้างอิง Metric ของ Account เดียวกัน
- Goal Type และ Target Value ต้องสามารถประเมินได้จากข้อมูลของ Metric
- Goal สามารถถูกสร้าง แก้ไข และลบได้โดยไม่กระทบ Metric Record

---

## 6. Delete and Data Lifecycle Rules

### Delete Group

เมื่อลบ Group:

```text
Group → DELETE
Metric.groupId → NULL
```

Metric และ Metric Record ต้องไม่ถูกลบ

---

### Delete Metric

เมื่อลบ Metric:

```text
Metric
├── MetricOption → DELETE
├── MetricRecord → DELETE
└── Goal → DELETE
```

Metric Option, Metric Record และ Goal ที่ขึ้นกับ Metric นั้นจะไม่มีความหมายเมื่อ Metric ถูกลบแล้ว จึงสามารถใช้ Cascade Delete ได้

ระบบควรถามยืนยันผู้ใช้งานก่อนดำเนินการลบ Metric เนื่องจากการลบ Metric ส่งผลต่อข้อมูลย้อนหลัง

---

### Disable Metric

การ Disable Metric ไม่เหมือนกับการ Delete

```text
Metric.isActive = false
```

ข้อมูลต่อไปนี้ยังคงอยู่:

- Metric
- Metric Option
- Metric Record
- Goal

ผู้ใช้งานสามารถเปิดใช้งาน Metric กลับมาในภายหลังได้

---

### Delete Metric Record

เมื่อลบ Metric Record ระบบจะลบเฉพาะ Record ที่ผู้ใช้งานเลือก

Metric และ Record อื่นของ Metric เดียวกันจะไม่ได้รับผลกระทบ

---

### Delete Goal

เมื่อลบ Goal:

```text
Goal → DELETE
```

Metric และ Metric Record จะไม่ถูกลบ

---

### Delete Account

หากระบบรองรับการลบ Account ในอนาคต ข้อมูลที่เป็นของ Account ควรถูกลบตาม Account ได้แก่

```text
Account
├── Group
├── Metric
│   ├── MetricOption
│   └── MetricRecord
└── Goal
```

การลบ Account ยังไม่จำเป็นต้องอยู่ใน Functional Scope ของ MVP หาก Requirement ไม่ได้กำหนดไว้

---

## 7. AI Analysis Data

AI Analysis ของ Glance ใช้ข้อมูลที่มีอยู่ในระบบเป็น Input หลัก ได้แก่

```text
Metric
Metric Record
Goal
```

รวมถึง Metadata ที่เกี่ยวข้อง เช่น

- Metric Type
- Unit
- Rating Range
- Recorded Time
- Record Note
- Goal Target
- Goal Period

AI สามารถใช้ข้อมูลเหล่านี้เพื่อวิเคราะห์ เช่น

### Trend Analysis

ตัวอย่าง:

> ค่าเฉลี่ยระยะเวลาการนอนในช่วง 7 วันที่ผ่านมาลดลงเมื่อเทียบกับสัปดาห์ก่อน

### Correlation Analysis

ตัวอย่าง:

> ในวันที่ผู้ใช้งานบันทึก Exercise ระดับ Energy โดยเฉลี่ยมีแนวโน้มสูงกว่าวันที่ไม่ได้บันทึก Exercise

ผลลัพธ์ต้องอธิบายในลักษณะความสัมพันธ์ของข้อมูล และไม่สรุปว่าเหตุการณ์หนึ่งเป็นสาเหตุของอีกเหตุการณ์หนึ่งโดยไม่มีข้อมูลรองรับ

### Goal Comparison

ตัวอย่าง:

> ผู้ใช้งานทำ Meditation ได้อย่างน้อย 30 นาทีใน 5 จาก 7 วันที่ผ่านมา

### Behavioral Summary

ตัวอย่าง:

> ในช่วงสองสัปดาห์ที่ผ่านมา การบันทึก Meditation เกิดขึ้นบ่อยที่สุดในช่วงเย็น

---

## 8. AI Result Storage

ใน MVP ระบบจะไม่สร้าง Entity สำหรับจัดเก็บผลลัพธ์ AI เช่น

```text
Insight
Prediction
AIResult
```

AI จะอ่านข้อมูลที่จำเป็นจาก Database และสร้างผลลัพธ์เมื่อระบบต้องการวิเคราะห์หรือแสดงผล

แนวทางนี้ช่วยให้:

- ผลวิเคราะห์อ้างอิงข้อมูลล่าสุด
- ลดความซับซ้อนของ Data Model
- ไม่ต้องจัดการข้อมูล Insight ที่หมดอายุหลังจาก Record ถูกแก้ไขหรือลบ
- เหมาะสมกับขอบเขตของ MVP

การกำหนดว่าจะวิเคราะห์ใหม่เมื่อใด เช่น เมื่อเปิด Dashboard, เมื่อผู้ใช้งาน Refresh หรือเมื่อข้อมูลเดิมหมดอายุ เป็นรายละเอียดของ Application และ AI Analysis Logic ไม่ใช่ข้อกำหนดของ Data Model

---

## 9. Dashboard Data

Dashboard ไม่จำเป็นต้องมี Entity แยกใน Database เนื่องจากเป็นข้อมูลที่สามารถคำนวณหรือ Aggregation จากข้อมูลหลักได้

Dashboard สามารถใช้ข้อมูลจาก:

```text
Metric
MetricRecord
Goal
```

เพื่อแสดง:

- ข้อมูลล่าสุด
- Daily Summary
- Weekly Summary
- ค่าเฉลี่ย
- จำนวนครั้ง
- แนวโน้ม
- Goal Progress
- AI Insight

ดังนั้น Dashboard เป็น Presentation และ Analysis Layer มากกว่าจะเป็น Persistent Entity

---

## 10. MVP Entity Summary

Entity หลักของ Glance MVP มีทั้งหมด 6 รายการ

| Entity       | Purpose                            |
| ------------ | ---------------------------------- |
| Account      | จัดเก็บข้อมูลบัญชีผู้ใช้งาน        |
| Group        | จัดกลุ่ม Metric                    |
| Metric       | กำหนดสิ่งที่ผู้ใช้งานต้องการติดตาม |
| MetricOption | เก็บตัวเลือกสำหรับ Select Metrics  |
| MetricRecord | เก็บข้อมูลที่ผู้ใช้งานบันทึก       |
| Goal         | เก็บเป้าหมายที่กำหนดให้กับ Metric  |

---

## 11. Out of Scope for Data Model

Data Model ของ MVP จะไม่สร้าง Entity หรือโครงสร้างเฉพาะสำหรับฟังก์ชันต่อไปนี้

- Multiple Profile
- LINE OA Integration
- Chatbot
- Notification
- Google Login
- Formula Metric
- Relation Metric
- Rollup Metric
- Derived Metric
- Session Tracking
- DateTime Metric
- Stored AI Insight
- Stored AI Prediction
- Health Connect
- Apple Health

ฟังก์ชันเหล่านี้สามารถพิจารณาเพิ่มเติมได้หลังจาก MVP หากมีการพัฒนาระบบต่อในอนาคต
