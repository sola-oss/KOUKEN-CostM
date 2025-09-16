#!/usr/bin/env tsx
// Database seed script for work hour management system
// Generates: 10 employees, 300 vendors, 30 projects, 90 work orders, 2000 time entries

import { SqliteDatabase } from '../server/dao/sqlite/database.js';
import { nowUtc, tokyoToUtc } from '../server/utils/timezone.js';
import { EmployeeRole, ProjectSegment } from '../shared/types.js';

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

const VENDOR_CATEGORIES = [
  '製造業', '建設業', '運送業', '卸売業', '小売業', 'サービス業',
  'IT関連', 'コンサルティング', '設備工事', '保守・メンテナンス'
];

const COMPANY_SUFFIXES = ['株式会社', '有限会社', '合同会社', '合資会社'];
const COMPANY_NAMES = [
  'アルファ', 'ベータ', 'ガンマ', 'デルタ', 'イプシロン', 'ゼータ',
  '東日本', '西日本', '中部', '関西', '九州', '四国', '北陸',
  'テック', 'システム', 'エンジニアリング', 'ソリューション',
  '工業', '産業', '製作所', '機械', '設備', '建設', '開発'
];

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhoneNumber(): string {
  const areaCode = randomChoice(['03', '06', '052', '092', '011']);
  const number = String(randomInt(1000, 9999)) + String(randomInt(1000, 9999));
  return `${areaCode}-${number.slice(0, 4)}-${number.slice(4)}`;
}

function generateEmail(name: string): string {
  const domain = randomChoice(['co.jp', 'jp', 'com']);
  const localPart = name.toLowerCase().replace(/[株式会社有限]/g, '');
  return `info@${localPart}.${domain}`;
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  const db = new SqliteDatabase();

  try {
    console.log('👥 Creating employees (10)...');
    
    // Create employees
    const employeeNames = [
      '田中太郎', '鈴木花子', '佐藤一郎', '高橋美咲', '中村健太',
      '小林さくら', '加藤雄介', '山田恵子', '松本拓海', '井上由美'
    ];

    const employees: any[] = [];
    for (let i = 0; i < employeeNames.length; i++) {
      const role: EmployeeRole = i < 2 ? 'manager' : i < 8 ? 'worker' : 'admin';
      const hourlyRate = role === 'manager' ? randomInt(4000, 6000) : 
                        role === 'admin' ? randomInt(5000, 8000) :
                        randomInt(2000, 4000);

      const employee = await db.employees.create({
        name: employeeNames[i],
        role,
        email: `${employeeNames[i].toLowerCase()}@company.co.jp`,
        hourly_cost_rate: hourlyRate,
        is_active: true,
      });
      employees.push(employee);
    }

    console.log('🏢 Creating vendors (300)...');

    // Create vendors
    const vendors: any[] = [];
    for (let i = 0; i < 300; i++) {
      const companyName = `${randomChoice(COMPANY_NAMES)}${randomChoice(COMPANY_SUFFIXES)}`;
      
      const vendor = await db.vendors.create({
        name: companyName,
        category: randomChoice(VENDOR_CATEGORIES),
        address_pref: randomChoice(PREFECTURES),
        phone: generatePhoneNumber(),
        email: generateEmail(companyName),
        payment_terms: randomChoice(['現金', '月末締め翌月末払い', '月末締め翌々月末払い', '都度請求']),
        is_active: Math.random() > 0.05, // 95% active
      });
      vendors.push(vendor);
    }

    console.log('📋 Creating projects (30)...');

    // Create projects
    const projectNames = [
      '温泉旅館リニューアル', '住宅展示場建設', 'サウナ施設新設', '観光案内システム',
      '住宅街開発計画', 'プレミアムサウナ', '観光バスターミナル', '高級住宅建設',
      'フィンランドサウナ', '観光情報アプリ', 'エコ住宅プロジェクト', '癒しのサウナ空間',
      '観光地活性化', 'スマートホーム', 'ロウリュウサウナ', '文化観光施設',
      '省エネ住宅設計', '都市型サウナ', '観光PR動画', 'バリアフリー住宅',
      '水風呂付きサウナ', 'インバウンド対応', '建売住宅開発', '貸切サウナ事業',
      'VR観光体験', 'リフォーム住宅', 'サウナ&カフェ', '観光ガイドブック',
      'モデルハウス建設', 'サウナグッズ開発'
    ];

    const projects: any[] = [];
    for (let i = 0; i < 30; i++) {
      const startDate = getDateDaysAgo(randomInt(180, 30));
      const endDate = Math.random() > 0.3 ? 
        getDateDaysAgo(randomInt(30, -30)) : // Some projects end in future
        null;

      const project = await db.projects.create({
        name: projectNames[i],
        customer: randomChoice([
          '株式会社山田工務店', '東京都', '田中建設', '観光協会',
          'サウナ愛好会', '住宅公社', 'リゾート開発', null
        ]),
        segment: randomChoice(['観光', '住宅', 'サウナ'] as ProjectSegment[]),
        start_date: startDate,
        end_date: endDate,
        vendor_id: Math.random() > 0.3 ? randomChoice(vendors).id : null,
        is_active: Math.random() > 0.1, // 90% active
      });
      projects.push(project);
    }

    console.log('🔧 Creating work orders (90)...');

    // Create work orders (3 per project on average)
    const operations = [
      '設計', '企画', '調査', '見積作成', '資材調達', '施工管理',
      '品質検査', 'テスト', '文書作成', 'プレゼン準備', '営業活動',
      '顧客対応', 'システム開発', 'デバッグ', 'デプロイ', '保守作業'
    ];

    const workOrders: any[] = [];
    for (const project of projects) {
      const numWorkOrders = randomInt(2, 4);
      for (let i = 0; i < numWorkOrders; i++) {
        const workOrder = await db.workOrders.create({
          project_id: project.id,
          operation: randomChoice(operations),
          std_minutes: randomInt(60, 480), // 1-8 hours standard
        });
        workOrders.push(workOrder);
      }
    }

    console.log('⏱️ Creating time entries (2000)...');

    // Create time entries distributed over last 2 months
    for (let i = 0; i < 2000; i++) {
      const employee = randomChoice(employees);
      const workOrder = randomChoice(workOrders);
      
      // Generate dates within last 60 days, weighted toward recent days
      const daysAgo = Math.floor(Math.pow(Math.random(), 2) * 60);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      
      // Generate work hours (typically 9:00-18:00 JST)
      const startHour = randomInt(8, 17);
      const duration = randomInt(30, 240); // 30 minutes to 4 hours
      
      const startDateTime = new Date(date);
      startDateTime.setHours(startHour, randomInt(0, 59), 0, 0);
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + duration);

      // Convert Tokyo time to UTC for storage
      const startAtUtc = tokyoToUtc(startDateTime.toISOString());
      const endAtUtc = tokyoToUtc(endDateTime.toISOString());

      const timeEntry = await db.timeEntries.create({
        employee_id: employee.id,
        work_order_id: workOrder.id,
        start_at: startAtUtc,
        end_at: endAtUtc,
        note: Math.random() > 0.7 ? randomChoice([
          '順調に進行中', '問題なく完了', 'お客様との打ち合わせあり',
          '資料作成に時間がかかった', '予定より早く完了',
          '追加作業が発生', 'レビュー対応', '修正作業'
        ]) : null,
      });

      // Approve 70% of time entries
      if (Math.random() > 0.3 && employee.role !== 'manager') {
        const approver = employees.find(e => e.role === 'manager') || employees[0];
        await db.timeEntries.approve(timeEntry.id, approver.id);
      }
    }

    console.log('✅ Seeding completed successfully!');
    
    // Show statistics
    const stats = await db.reports.getDashboardStats();
    console.log('\n📊 Seeding Statistics:');
    console.log(`  Employees: ${employees.length}`);
    console.log(`  Vendors: ${vendors.length}`);
    console.log(`  Projects: ${projects.length}`);
    console.log(`  Work Orders: ${workOrders.length}`);
    console.log(`  Total Hours Today: ${stats.todayHours}`);
    console.log(`  Pending Approvals: ${stats.pendingApprovals}`);
    console.log(`  Active Projects: ${stats.activeProjects}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run if called directly
seedDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});