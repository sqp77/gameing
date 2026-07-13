// Shared tunable configuration for the whole game.

export const LANES = [-3.2, 0, 3.2];
export const LANE_COUNT = LANES.length;

export const GAME_DURATION = 60; // seconds

export const BASE_SPEED = 18; // m/s
export const MAX_SPEED = 34; // m/s
export const DIFFICULTY_RAMP_TIME = 55; // seconds to reach max difficulty

export const LANE_SWITCH_TIME = 0.22; // seconds to slide between lanes

export const SPAWN_Z = -140; // where props/items spawn ahead of the vehicle
export const DESPAWN_Z = 14; // where props/items are recycled behind the camera
export const VEHICLE_Z = 0;
export const CAMERA_OFFSET = { x: 0, y: 4.6, z: 8.6 };

export const CRASH_SLOWDOWN = 0.45; // multiplier applied to speed on crash
export const CRASH_RECOVERY_TIME = 1.1; // seconds to recover back to normal speed

export const COMBO_WINDOW = 2.2; // seconds allowed between collects to keep combo alive
export const COMBO_MAX_MULTIPLIER = 5;

export const ITEM_TYPES = {
  plastic: { name: 'زجاجة بلاستيكية', points: 10, color: 0x3fb6e0, category: 'plastic' },
  metal: { name: 'علبة ألمنيوم', points: 15, color: 0xc9ced6, category: 'metal' },
  cardboard: { name: 'كرتون', points: 12, color: 0xb5814a, category: 'cardboard' },
  paper: { name: 'أوراق', points: 8, color: 0xf2e9d8, category: 'paper' },
  glass: { name: 'عبوة زجاجية', points: 18, color: 0x2ecc71, category: 'glass' },
};

export const OBSTACLE_TYPES = {
  barrier: { name: 'حاجز طريق', penalty: 20 },
  cone: { name: 'مخروط مروري', penalty: 12 },
  tire: { name: 'إطار', penalty: 18 },
  garbageBag: { name: 'كيس قمامة', penalty: 15 },
};

export const STAR_THRESHOLDS = [
  { min: 900, stars: 5, label: 'أداء استثنائي' },
  { min: 650, stars: 4, label: 'ممتاز' },
  { min: 420, stars: 3, label: 'جيد' },
  { min: 220, stars: 2, label: 'مقبول' },
  { min: 0, stars: 1, label: 'يحتاج تحسين' },
];

export const ACHIEVEMENTS = {
  firstCollect: { id: 'firstCollect', name: 'أول خطوة خضراء', desc: 'اجمع أول عنصر قابل لإعادة التدوير' },
  combo5: { id: 'combo5', name: 'سلسلة النجاح', desc: 'حقق كومبو x5' },
  ecoHero: { id: 'ecoHero', name: 'بطل البيئة', desc: 'اجمع 25 عنصرًا في جولة واحدة' },
  cleanRun: { id: 'cleanRun', name: 'قيادة نظيفة', desc: 'أنهِ الجولة بدون الاصطدام بأي عائق' },
  highScorer: { id: 'highScorer', name: 'نجم التدوير', desc: 'احصل على 500 نقطة أو أكثر في جولة واحدة' },
};

export const STORAGE_KEYS = {
  bestScore: 'sr_best_score',
  totalItems: 'sr_total_items',
  leaderboard: 'sr_leaderboard',
  achievements: 'sr_achievements',
  muted: 'sr_muted',
};
