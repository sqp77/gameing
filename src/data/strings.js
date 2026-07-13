/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

// Flat i18n table: every UI-facing string in the app keyed once, English + Arabic side by
// side. Consumed by core/I18n.js (t() for JS-built text, apply() for data-i18n DOM sweeps).
// Kept as one file (not split per-screen) so a translator/reviewer can scan the whole app's
// copy in one place — mirrors the project's existing "pure data, separate from logic that
// consumes it" convention (see data/achievements.js, world/themes.js).
export const STRINGS = {
  // ---- Common ----
  'common.back': { en: 'Back', ar: 'رجوع' },
  'common.menu': { en: 'Menu', ar: 'القائمة' },
  'common.cancel': { en: 'Cancel', ar: 'إلغاء' },
  'common.ownershipFooter': { en: 'Created by Saud Alqhtani | GitHub: sqp77', ar: 'من إعداد سعود القحطاني | GitHub: sqp77' },
  'common.coinsSuffix': { en: ' coins', ar: ' عملة' },
  'common.createdByLabel': { en: 'Created by', ar: 'تم التطوير بواسطة' },
  'common.githubLabel': { en: 'GitHub:', ar: 'GitHub:' },
  'common.creatorShort': { en: 'Saud Alqhtani • sqp77', ar: 'Saud Alqhtani • sqp77' },

  // ---- Auth ----
  'auth.welcomeDefault': { en: 'Sign in to save your progress across sessions', ar: 'سجّل الدخول لحفظ تقدمك عبر الجلسات' },
  'auth.welcomeReturning': { en: 'Choose a profile or sign in with a new account', ar: 'اختر حسابًا أو سجّل الدخول بحساب جديد' },
  'auth.signInApple': { en: 'Sign in with Apple', ar: 'الدخول عبر Apple' },
  'auth.signInGoogle': { en: 'Sign in with Google', ar: 'الدخول عبر Google' },
  'auth.signInFacebook': { en: 'Sign in with Facebook', ar: 'الدخول عبر Facebook' },
  'auth.signInXbox': { en: 'Sign in with Xbox', ar: 'الدخول عبر Xbox' },
  'auth.displayName': { en: 'Display Name', ar: 'الاسم المعروض' },
  'auth.namePlaceholder': { en: 'Your name', ar: 'اسمك' },
  'auth.email': { en: 'Email (optional)', ar: 'البريد الإلكتروني (اختياري)' },
  'auth.emailPlaceholder': { en: 'you@example.com', ar: 'you@example.com' },
  'auth.continue': { en: 'Continue', ar: 'متابعة' },
  'auth.continueGuest': { en: 'Continue as Guest', ar: 'المتابعة كضيف' },
  'auth.remove': { en: 'Remove from this device', ar: 'إزالة من هذا الجهاز' },

  // ---- Account bar ----
  'account.welcomePrefix': { en: 'Welcome, ', ar: 'أهلًا، ' },
  'account.defaultWelcome': { en: 'Welcome, Driver', ar: 'أهلًا بك أيها السائق' },

  // ---- Main menu ----
  'menu.play': { en: 'Play', ar: 'العب' },
  'menu.continuePrefix': { en: 'Continue — Level ', ar: 'متابعة — المستوى ' },
  'menu.levelSelect': { en: 'Level Select', ar: 'اختيار المستوى' },
  'menu.progress': { en: 'Progress', ar: 'التقدم' },
  'menu.shop': { en: 'Shop', ar: 'المتجر' },
  'menu.daily': { en: 'Daily Challenges', ar: 'التحديات اليومية' },
  'menu.achievements': { en: 'Achievements', ar: 'الإنجازات' },
  'menu.settings': { en: 'Settings', ar: 'الإعدادات' },
  'menu.credits': { en: 'Credits', ar: 'صنّاع اللعبة' },
  'menu.signIn': { en: 'Sign In', ar: 'تسجيل الدخول' },
  'menu.profile': { en: 'Profile', ar: 'الملف الشخصي' },
  'menu.logout': { en: 'Logout', ar: 'تسجيل الخروج' },
  'menu.academy': { en: 'Driving Academy', ar: 'أكاديمية القيادة' },
  'menu.licenseTest': { en: 'Driving Test', ar: 'اختبار القيادة' },
  'menu.overviewComplete': { en: 'Complete: ', ar: 'الإنجاز: ' },
  'menu.overviewStars': { en: 'Stars: ', ar: 'النجوم: ' },
  'menu.overviewCoins': { en: 'Coins: ', ar: 'العملات: ' },
  'menu.overviewVehicle': { en: 'Vehicle: ', ar: 'المركبة: ' },
  'menu.bestScorePrefix': { en: 'Best Score: ', ar: 'أفضل نتيجة: ' },
  'menu.exit': { en: 'Exit', ar: 'خروج' },

  // ---- Main menu: quick access panel ----
  'menu.quickAccess.title': { en: 'Quick Access', ar: 'الوصول السريع' },
  'menu.quickAccess.lastMode': { en: 'Last Played', ar: 'آخر وضع' },
  'menu.quickAccess.currentCity': { en: 'Current City', ar: 'المدينة الحالية' },
  'menu.quickAccess.latestAchievement': { en: 'Latest Achievement', ar: 'أحدث إنجاز' },
  'menu.quickAccess.resumeHint': { en: 'Tap to resume', ar: 'اضغط للمتابعة' },
  'menu.quickAccess.noneYet': { en: 'None yet', ar: 'لا يوجد بعد' },

  // ---- Main menu: player progress card ----
  'menu.progressCard.title': { en: 'Your Progress', ar: 'تقدمك' },

  // ---- Level select ----
  'levelSelect.title': { en: 'Select Level', ar: 'اختر المستوى' },

  // ---- Achievements ----
  'achievements.title': { en: 'Achievements', ar: 'الإنجازات' },
  'achievements.unlockedSuffix': { en: 'Unlocked', ar: 'مفتوح' },

  // ---- Progress ----
  'progress.title': { en: 'Player Progress', ar: 'تقدم اللاعب' },
  'progress.levelRecords': { en: 'Level Records', ar: 'سجلات المستويات' },
  'progress.recentAchievements': { en: 'Recent Achievements', ar: 'أحدث الإنجازات' },
  'progress.noAchievements': { en: 'No achievements unlocked yet', ar: 'لا توجد إنجازات مفتوحة بعد' },
  'progress.locked': { en: 'Locked', ar: 'مقفل' },
  'progress.rowLevelPrefix': { en: 'Level ', ar: 'المستوى ' },
  'progress.stat.currentLevel': { en: 'Current Level', ar: 'المستوى الحالي' },
  'progress.stat.highestUnlocked': { en: 'Highest Unlocked', ar: 'أعلى مستوى مفتوح' },
  'progress.stat.levelsCompleted': { en: 'Levels Completed', ar: 'المستويات المكتملة' },
  'progress.stat.totalStars': { en: 'Total Stars', ar: 'إجمالي النجوم' },
  'progress.stat.completion': { en: 'Completion', ar: 'نسبة الإنجاز' },
  'progress.stat.totalPlayTime': { en: 'Total Play Time', ar: 'إجمالي وقت اللعب' },
  'progress.stat.totalDistance': { en: 'Total Distance', ar: 'إجمالي المسافة' },
  'progress.stat.parksCompleted': { en: 'Parks Completed', ar: 'عمليات الاصطفاف المكتملة' },
  'progress.stat.totalRestarts': { en: 'Total Restarts', ar: 'إجمالي إعادة المحاولة' },
  'progress.stat.totalCollisions': { en: 'Total Collisions', ar: 'إجمالي الاصطدامات' },
  'progress.stat.highestScore': { en: 'Highest Score', ar: 'أعلى نتيجة' },
  'progress.stat.bestAccuracy': { en: 'Best Accuracy', ar: 'أفضل دقة' },
  'progress.stat.averageAccuracy': { en: 'Average Accuracy', ar: 'متوسط الدقة' },
  'progress.stat.mostPlayedLevel': { en: 'Most Played Level', ar: 'الأكثر لعبًا' },
  'progress.stat.favoriteVehicle': { en: 'Favorite Vehicle', ar: 'المركبة المفضلة' },
  'progress.stat.coins': { en: 'Coins', ar: 'العملات' },
  'progress.stat.coinsEarned': { en: 'Coins Earned', ar: 'العملات المكتسبة' },
  'progress.stat.currentVehicle': { en: 'Current Vehicle', ar: 'المركبة الحالية' },
  'progress.row.bestScore': { en: 'Best Score', ar: 'أفضل نتيجة' },
  'progress.row.bestTime': { en: 'Best Time', ar: 'أفضل وقت' },
  'progress.row.accuracy': { en: 'Accuracy', ar: 'الدقة' },
  'progress.row.rating': { en: 'Rating', ar: 'التقييم' },
  'progress.row.collisions': { en: 'Collisions', ar: 'الاصطدامات' },

  // ---- Shop ----
  'shop.title': { en: 'Vehicle Shop', ar: 'متجر المركبات' },
  'shop.coinsPrefix': { en: 'Coins: ', ar: 'العملات: ' },
  'shop.owned': { en: 'Owned', ar: 'مملوكة' },
  'shop.use': { en: 'Use', ar: 'استخدام' },
  'shop.buy': { en: 'Buy', ar: 'شراء' },
  'shop.selectedSuffix': { en: ' (Selected)', ar: ' (محددة)' },
  'shop.preview': { en: 'Preview', ar: 'معاينة' },
  'shop.spec.topSpeed': { en: 'Top Speed', ar: 'السرعة القصوى' },
  'shop.spec.acceleration': { en: 'Acceleration', ar: 'التسارع' },
  'shop.spec.handling': { en: 'Handling', ar: 'مقود التحكم' },

  // ---- Daily challenges ----
  'daily.title': { en: 'Daily Challenges', ar: 'التحديات اليومية' },
  'daily.complete': { en: 'Complete', ar: 'مكتمل' },
  'challenge.complete1': { en: 'Complete 1 level', ar: 'أكمل مستوى واحدًا' },
  'challenge.complete3': { en: 'Complete 3 levels', ar: 'أكمل 3 مستويات' },
  'challenge.noCollision1': { en: 'Finish a level with no collisions', ar: 'أنهِ مستوى دون أي اصطدام' },
  'challenge.threeStar1': { en: 'Earn 3 stars on a level', ar: 'احصل على 3 نجوم في مستوى' },
  'challenge.fastTime1': { en: 'Finish a level in under 60 seconds', ar: 'أنهِ مستوى في أقل من 60 ثانية' },
  'challenge.event.nationalDay': { en: 'Complete a level during National Day', ar: 'أكمل مستوى خلال اليوم الوطني' },
  'challenge.event.foundingDay': { en: 'Complete a level during Founding Day', ar: 'أكمل مستوى خلال يوم التأسيس' },
  'challenge.event.riyadhSeason': { en: 'Complete a level during Riyadh Season', ar: 'أكمل مستوى خلال موسم الرياض' },

  // ---- Settings ----
  'settings.title': { en: 'Settings', ar: 'الإعدادات' },
  'settings.search': { en: 'Search settings…', ar: 'ابحث في الإعدادات…' },
  'settings.noResults': { en: 'No matching settings', ar: 'لا توجد إعدادات مطابقة' },
  'settings.group.general': { en: 'General', ar: 'عام' },
  'settings.group.graphics': { en: 'Graphics', ar: 'الرسومات' },
  'settings.group.audio': { en: 'Audio', ar: 'الصوت' },
  'settings.group.language': { en: 'Language', ar: 'اللغة' },
  'settings.group.controls': { en: 'Controls', ar: 'التحكم' },
  'settings.volume': { en: 'Master Volume', ar: 'مستوى الصوت' },
  'settings.camera': { en: 'Camera', ar: 'الكاميرا' },
  'settings.cameraThird': { en: 'Third Person', ar: 'منظور الغائب' },
  'settings.cameraFirst': { en: 'First Person', ar: 'منظور المتكلم' },
  'settings.cameraTop': { en: 'Top Down', ar: 'منظور علوي' },
  'settings.cameraReverse': { en: 'Reverse Camera', ar: 'كاميرا الرجوع' },
  'settings.cameraCinematic': { en: 'Cinematic', ar: 'سينمائية' },
  'settings.dayNight': { en: 'Day/Night Cycle', ar: 'دورة الليل والنهار' },
  'settings.weather': { en: 'Dynamic Weather', ar: 'الطقس الديناميكي' },
  'settings.sensitivity': { en: 'Steering Sensitivity', ar: 'حساسية التوجيه' },
  'settings.shadows': { en: 'Shadows', ar: 'الظلال' },
  'settings.ghostReplay': { en: 'Ghost Replay', ar: 'إعادة تشغيل الشبح' },
  'settings.assist': { en: 'Parking Assist', ar: 'مساعد الاصطفاف' },
  'settings.language': { en: 'Language', ar: 'اللغة' },
  'settings.events': { en: 'National Events', ar: 'المناسبات الوطنية' },
  'settings.saveData': { en: 'Save Data', ar: 'بيانات الحفظ' },
  'settings.export': { en: 'Export', ar: 'تصدير' },
  'settings.import': { en: 'Import', ar: 'استيراد' },
  'settings.langEnglish': { en: 'English', ar: 'الإنجليزية' },
  'settings.langArabic': { en: 'Arabic', ar: 'العربية' },

  // ---- Profile ----
  'profile.title': { en: 'Profile', ar: 'الملف الشخصي' },
  'profile.email': { en: 'Email', ar: 'البريد الإلكتروني' },
  'profile.memberSince': { en: 'Member Since', ar: 'عضو منذ' },
  'profile.switchAccount': { en: 'Switch Account', ar: 'تبديل الحساب' },
  'profile.logout': { en: 'Logout', ar: 'تسجيل الخروج' },
  'profile.notProvided': { en: 'Not provided', ar: 'غير مُدخل' },
  'profile.license': { en: 'MASAR License', ar: 'رخصة مسار' },
  'profile.licensed': { en: 'Licensed Driver', ar: 'سائق مرخّص' },
  'profile.notLicensed': { en: 'Not Licensed Yet', ar: 'لم يحصل على الرخصة بعد' },
  'profile.violationHistory.title': { en: 'Violation History', ar: 'سجل المخالفات' },
  'profile.violationHistory.totalPrefix': { en: 'Total violations: ', ar: 'إجمالي المخالفات: ' },
  'profile.violationHistory.empty': { en: 'Clean record — no violations yet', ar: 'سجل نظيف — لا توجد مخالفات بعد' },

  // ---- Credits ----
  'credits.title': { en: 'Credits', ar: 'صنّاع اللعبة' },

  // ---- HUD ----
  'hud.level': { en: 'Level', ar: 'المستوى' },
  'hud.score': { en: 'Score', ar: 'النتيجة' },
  'hud.restartTitle': { en: 'Restart Level (R)', ar: 'إعادة المستوى (R)' },
  'hud.holdPosition': { en: 'Hold position to complete parking...', ar: 'حافظ على وضعك لإكمال الاصطفاف...' },

  // ---- Level objectives ----
  'objective.level1': { en: 'Drive forward and park inside the marked spot', ar: 'انطلق للأمام واصطفّ داخل المكان المحدد' },
  'objective.level2': { en: 'Park between the two parked cars', ar: 'اصطفّ بين السيارتين المتوقفتين' },
  'objective.level3': { en: 'Angled parking: ease in at the marked angle', ar: 'اصطفاف مائل: ادخل بلطف بالزاوية المحددة' },
  'objective.level4': { en: 'Tight spot — line up carefully before pulling in', ar: 'مكان ضيق — احرص على المحاذاة قبل الدخول' },
  'objective.level5': { en: 'Mind the cone — angled parking under time pressure', ar: 'احذر المخروط — اصطفاف مائل تحت ضغط الوقت' },
  'objective.level6': { en: 'First parallel park — pull alongside, then reverse in', ar: 'أول اصطفاف موازٍ — حاذِ السيارة ثم ارجع للخلف' },
  'objective.decoys': { en: 'Park in the highlighted spot — ignore the decoys', ar: 'اصطفّ في المكان المميّز وتجاهل الأماكن الأخرى' },
  'objective.requireReverse': { en: 'Reverse parking required — back into the marked spot', ar: 'مطلوب الاصطفاف الرجوعي — ارجع إلى المكان المحدد' },
  'objective.parallel': { en: 'Parallel park within the marked bay', ar: 'اصطفّ اصطفافًا موازيًا داخل المكان المحدد' },
  'objective.default': { en: 'Park accurately inside the marked spot', ar: 'اصطفّ بدقة داخل المكان المحدد' },

  // ---- Parking type labels ----
  'parkingType.parallel': { en: 'Parallel Parking', ar: 'اصطفاف موازٍ' },
  'parkingType.reverse': { en: 'Reverse Parking', ar: 'اصطفاف رجوعي' },
  'parkingType.perpendicular': { en: 'Perpendicular Parking', ar: 'اصطفاف عمودي' },
  'parkingType.angled': { en: 'Angled Parking', ar: 'اصطفاف مائل' },

  // ---- Pause / restart confirm / replay ----
  'pause.title': { en: 'Paused', ar: 'إيقاف مؤقت' },
  'pause.resume': { en: 'Resume', ar: 'استئناف' },
  'pause.restart': { en: 'Restart Level', ar: 'إعادة المستوى' },
  'pause.quit': { en: 'Quit to Menu', ar: 'الخروج للقائمة' },
  'pause.photoMode': { en: 'Photo Mode', ar: 'وضع التصوير' },
  'photoMode.hint': { en: 'Drag to orbit · Scroll to zoom', ar: 'اسحب للدوران · مرر للتكبير' },
  'photoMode.screenshot': { en: 'Screenshot', ar: 'لقطة شاشة' },
  'photoMode.exit': { en: 'Exit', ar: 'خروج' },
  'restartConfirm.title': { en: 'Restart Level?', ar: 'إعادة المستوى؟' },
  'restartConfirm.body': {
    en: 'Your current timer, score, and collisions for this attempt will be reset.',
    ar: 'سيتم إعادة ضبط المؤقت والنتيجة والاصطدامات لهذه المحاولة.',
  },
  'replay.watchingBestRun': { en: 'Watching Best Run', ar: 'مشاهدة أفضل محاولة' },
  'replay.stop': { en: 'Stop', ar: 'إيقاف' },

  // ---- Victory / Game over ----
  'victory.title': { en: 'Parked!', ar: 'تم الاصطفاف!' },
  'victory.row.base': { en: 'Base', ar: 'الأساس' },
  'victory.row.timeBonus': { en: 'Time Bonus', ar: 'مكافأة الوقت' },
  'victory.row.accuracyBonus': { en: 'Accuracy Bonus', ar: 'مكافأة الدقة' },
  'victory.row.noCollisionBonus': { en: 'No-Collision Bonus', ar: 'مكافأة عدم الاصطدام' },
  'victory.row.penalties': { en: 'Penalties', ar: 'الخصومات' },
  'victory.row.coinsEarned': { en: 'Coins Earned', ar: 'العملات المكتسبة' },
  'victory.totalPrefix': { en: 'Total: ', ar: 'الإجمالي: ' },
  'victory.nextLevel': { en: 'Next Level', ar: 'المستوى التالي' },
  'victory.watchReplay': { en: 'Watch Replay', ar: 'مشاهدة الإعادة' },
  'victory.retry': { en: 'Retry', ar: 'إعادة المحاولة' },
  'gameover.title': { en: "Time's Up", ar: 'انتهى الوقت' },
  'gameover.reasonTimeUp': { en: 'You ran out of time.', ar: 'لقد نفد وقتك.' },
  'gameover.reasonLicenseFail': { en: 'You did not meet the test requirements.', ar: 'لم تستوفِ متطلبات الاختبار.' },

  // ---- Rating tiers ----
  'rating.perfect': { en: 'Perfect', ar: 'ممتاز جدًا' },
  'rating.excellent': { en: 'Excellent', ar: 'ممتاز' },
  'rating.great': { en: 'Great', ar: 'جيد جدًا' },
  'rating.good': { en: 'Good', ar: 'جيد' },
  'rating.needsImprovement': { en: 'Needs Improvement', ar: 'يحتاج تحسين' },

  // ---- Loading ----
  'loading.tagline': { en: 'Smart Driving & Parking Simulator', ar: 'محاكي القيادة والاصطفاف الذكي' },

  // ---- Toasts ----
  'toast.wrongSpot': { en: 'Wrong spot!', ar: 'مكان خاطئ!' },
  'toast.collision': { en: 'Collision! -40', ar: 'اصطدام! -40' },
  'toast.outOfBounds': { en: 'Out of bounds! -25', ar: 'خارج الحدود! -25' },
  'toast.saveImported': { en: 'Save imported', ar: 'تم استيراد الحفظ' },
  'toast.saveInvalid': { en: 'Invalid save file', ar: 'ملف حفظ غير صالح' },
  'toast.notEnoughCoins': { en: 'Not enough coins', ar: 'العملات غير كافية' },
  'toast.vehicleUnlocked': { en: '{0} unlocked!', ar: 'تم فتح {0}!' },
  'toast.newVehicleUnlocked': { en: 'New vehicle unlocked: {0}', ar: 'مركبة جديدة: {0}' },
  'toast.dailyComplete': { en: 'Daily complete: +{0} coins', ar: 'اكتمل التحدي اليومي: +{0} عملة' },
  'toast.academyStageComplete': { en: 'Stage complete!', ar: 'تم إكمال المرحلة!' },
  'toast.academyModuleCertified': { en: 'Module certified!', ar: 'تم اعتماد الوحدة!' },
  'toast.licensePassed': { en: 'You passed! MASAR license earned.', ar: 'لقد نجحت! تم الحصول على رخصة مسار.' },
  'toast.licenseFailed': { en: 'Test failed — review the requirements and try again.', ar: 'فشل الاختبار — راجع المتطلبات وحاول مجددًا.' },
  'toast.eventCoinBonus': { en: 'Event bonus: +{0}% coins', ar: 'مكافأة المناسبة: +{0}% عملات' },
  'toast.exitHint': { en: 'Close this browser tab to exit', ar: 'أغلق تبويب المتصفح للخروج' },

  // ---- Achievement popup ----
  'achievement.unlockedTitle': { en: 'Achievement Unlocked', ar: 'تم فتح إنجاز' },

  // ---- Achievement defs ----
  'achievement.no_collision.name': { en: 'Clean Parker', ar: 'سائق نظيف' },
  'achievement.no_collision.desc': { en: 'Complete a level without any collisions.', ar: 'أكمل مستوى دون أي اصطدام.' },
  'achievement.speed_master.name': { en: 'Speed Master', ar: 'سيد السرعة' },
  'achievement.speed_master.desc': { en: 'Finish a level in under 20 seconds.', ar: 'أنهِ مستوى في أقل من 20 ثانية.' },
  'achievement.perfect_parking.name': { en: 'Perfect Parking', ar: 'اصطفاف مثالي' },
  'achievement.perfect_parking.desc': { en: 'Achieve maximum parking accuracy.', ar: 'حقق أقصى دقة في الاصطفاف.' },
  'achievement.precision_driver.name': { en: 'Precision Driver', ar: 'سائق دقيق' },
  'achievement.precision_driver.desc': { en: 'Complete 5 levels with no collisions.', ar: 'أكمل 5 مستويات دون اصطدام.' },
  'achievement.parking_expert.name': { en: 'Parking Expert', ar: 'خبير الاصطفاف' },
  'achievement.parking_expert.desc': { en: 'Earn 3 stars on every level.', ar: 'احصل على 3 نجوم في كل مستوى.' },
  'achievement.night_driver.name': { en: 'Night Driver', ar: 'سائق الليل' },
  'achievement.night_driver.desc': { en: 'Complete all night-themed levels.', ar: 'أكمل جميع مستويات الليل.' },
  'achievement.vehicle_collector.name': { en: 'Vehicle Collector', ar: 'جامع المركبات' },
  'achievement.vehicle_collector.desc': { en: 'Unlock every vehicle.', ar: 'افتح جميع المركبات.' },
  'achievement.combo_master.name': { en: 'Combo Master', ar: 'سيد التوافق' },
  'achievement.combo_master.desc': { en: 'Earn multiple achievements in a single run.', ar: 'احصل على عدة إنجازات في محاولة واحدة.' },
  'achievement.event_nationalDay.name': { en: 'National Day Driver', ar: 'سائق اليوم الوطني' },
  'achievement.event_nationalDay.desc': { en: 'Complete a level during Saudi National Day.', ar: 'أكمل مستوى خلال اليوم الوطني السعودي.' },
  'achievement.event_foundingDay.name': { en: 'Founding Day Driver', ar: 'سائق يوم التأسيس' },
  'achievement.event_foundingDay.desc': { en: 'Complete a level during Founding Day.', ar: 'أكمل مستوى خلال يوم التأسيس.' },
  'achievement.event_riyadhSeason.name': { en: 'Riyadh Season Driver', ar: 'سائق موسم الرياض' },
  'achievement.event_riyadhSeason.desc': { en: 'Complete a level during Riyadh Season.', ar: 'أكمل مستوى خلال موسم الرياض.' },

  // ---- Vehicles ----
  'vehicle.hatchback.name': { en: 'City Hatchback', ar: 'هاتشباك المدينة' },
  'vehicle.sedan.name': { en: 'Sport Sedan', ar: 'سيدان رياضية' },
  'vehicle.suv.name': { en: 'Urban SUV', ar: 'دفع رباعي حضري' },
  'vehicle.coupe.name': { en: 'Speed Coupe', ar: 'كوبيه سريعة' },
  'vehicle.pickup.name': { en: 'Desert Pickup', ar: 'بيك أب الصحراء' },
  'vehicle.ev.name': { en: 'Volt Runner EV', ar: 'فولت رنر الكهربائية' },

  // ---- Driving Academy ----
  'academy.title': { en: 'MASAR Driving Academy', ar: 'أكاديمية مسار للقيادة' },
  'academy.subtitle': { en: 'Master every parking technique, stage by stage', ar: 'أتقن كل تقنية اصطفاف، مرحلة بمرحلة' },
  'academy.module.basics': { en: 'Driving Basics', ar: 'أساسيات القيادة' },
  'academy.module.parallel': { en: 'Parallel Parking', ar: 'الاصطفاف الموازي' },
  'academy.module.reverse': { en: 'Reverse Parking', ar: 'الاصطفاف الرجوعي' },
  'academy.module.perpendicular': { en: 'Perpendicular Parking', ar: 'الاصطفاف العمودي' },
  'academy.module.precision': { en: 'Precision Parking', ar: 'الاصطفاف الدقيق' },
  'academy.stagePrefix': { en: 'Stage ', ar: 'المرحلة ' },
  'academy.certified': { en: 'Certified', ar: 'معتمدة' },
  'academy.certificateTitle': { en: 'Certificate of Completion', ar: 'شهادة إتمام' },
  'academy.certificateBody': { en: 'has successfully completed', ar: 'أكمل بنجاح' },
  'academy.saveCertificate': { en: 'Save Certificate', ar: 'حفظ الشهادة' },

  // ---- Driving License Test ----
  'license.title': { en: 'Driving Test', ar: 'اختبار القيادة' },
  'license.subtitle': {
    en: 'Complete a full route to earn your MASAR Digital Driving License',
    ar: 'أكمل مسارًا كاملاً للحصول على رخصة مسار الرقمية',
  },
  'license.routePrefix': { en: 'Route ', ar: 'المسار ' },
  'license.start': { en: 'Start Test', ar: 'ابدأ الاختبار' },
  'license.passed': { en: 'Test Passed', ar: 'نجح الاختبار' },
  'license.failed': { en: 'Test Failed', ar: 'فشل الاختبار' },
  'license.certificateTitle': { en: 'MASAR Digital Driving License', ar: 'رخصة مسار الرقمية' },
  'license.legPrefix': { en: 'Maneuver ', ar: 'المناورة ' },
  'license.summaryTime': { en: 'Time Remaining', ar: 'الوقت المتبقي' },
  'license.summaryCollisions': { en: 'Collisions', ar: 'الاصطدامات' },
  'license.summaryAccuracy': { en: 'Average Accuracy', ar: 'متوسط الدقة' },
  'license.continueNext': { en: 'Continue', ar: 'التالي' },
  'license.maneuversLabel': { en: 'Maneuvers', ar: 'المناورات' },
  'license.timeLimitLabel': { en: 'Time Limit', ar: 'الوقت المحدد' },

  // ---- Road signs ----
  'roadSign.stop': { en: 'Stop', ar: 'قف' },
  'roadSign.oneWay': { en: 'One Way', ar: 'اتجاه واحد' },
  'roadSign.noParking': { en: 'No Parking', ar: 'ممنوع الوقوف' },
  'roadSign.bump': { en: 'Bump', ar: 'مطب' },
  'roadSign.parking': { en: 'Parking', ar: 'مواقف' },
  'roadSign.exit': { en: 'Exit', ar: 'مخرج' },
  'roadSign.entrance': { en: 'Entrance', ar: 'دخول' },
  'roadSign.caution': { en: 'Caution', ar: 'انتبه' },

  // ---- National events ----
  'event.nationalDay.name': { en: 'Saudi National Day', ar: 'اليوم الوطني السعودي' },
  'event.foundingDay.name': { en: 'Founding Day', ar: 'يوم التأسيس' },
  'event.riyadhSeason.name': { en: 'Riyadh Season', ar: 'موسم الرياض' },

  // ---- v1.1.0: Open World Hub (Feature 1) ----
  'menu.openWorld': { en: 'Explore Open World', ar: 'استكشف العالم المفتوح' },
  'hub.freeRoam': { en: 'Free Roam — drive to a landmark or job marker', ar: 'تجوّل حر — توجّه إلى معلم أو مهمة' },
  'hub.academy.name': { en: 'MASAR Academy', ar: 'أكاديمية مسار' },
  'hub.license.name': { en: 'License Center', ar: 'مركز رخص القيادة' },
  'hub.shop.name': { en: 'Dealership', ar: 'معرض السيارات' },
  'hub.academy.desc': { en: 'Driving Academy training modules', ar: 'وحدات تدريب أكاديمية القيادة' },
  'hub.license.desc': { en: 'MASAR Driving License Test', ar: 'اختبار رخصة قيادة مسار' },
  'hub.shop.desc': { en: 'Buy and select vehicles', ar: 'شراء واختيار المركبات' },
  'common.version': { en: 'v1.2.0', ar: 'الإصدار 1.2.0' },
  'common.appTitle': { en: 'MASAR — Smart Driving & Parking Simulator', ar: 'مسار — محاكي القيادة والاصطفاف الذكي' },

  // ---- v1.1.0: Job System (Feature 2) ----
  'jobs.accept': { en: 'Accept', ar: 'قبول' },
  'jobs.decline': { en: 'Decline', ar: 'رفض' },
  'jobs.arrivedPickup': { en: 'Package picked up — head to the drop-off', ar: 'تم الاستلام — توجّه لنقطة التسليم' },
  'jobs.completedToast': { en: 'Job complete! +{0} coins, +{1} XP', ar: 'اكتملت المهمة! +{0} عملة، +{1} خبرة' },
  'jobs.failedToast': { en: 'Job failed — time ran out', ar: 'فشلت المهمة — انتهى الوقت' },
  'jobs.type.parking': { en: 'Parking Job', ar: 'مهمة اصطفاف' },
  'jobs.desc.parking': { en: 'Park the vehicle accurately in the marked spot', ar: 'اصطفّ المركبة بدقة في المكان المحدد' },
  'jobs.type.delivery': { en: 'Delivery Mission', ar: 'مهمة توصيل' },
  'jobs.desc.delivery': { en: 'Deliver the package to the drop-off marker', ar: 'وصّل الطرد إلى نقطة التسليم' },
  'jobs.type.taxi': { en: 'Taxi Mission', ar: 'مهمة تكسي' },
  'jobs.desc.taxi': { en: 'Drive the passenger to their destination', ar: 'أوصل الراكب إلى وجهته' },
  'jobs.type.valet': { en: 'Valet Parking Mission', ar: 'مهمة صف السيارات' },
  'jobs.desc.valet': { en: 'Drive the car to the destination and park it perfectly', ar: 'أوصل السيارة إلى الوجهة واصطفّها بإتقان' },

  // ---- v1.1.0: Reputation (Feature 4) ----
  'reputation.rank.beginner': { en: 'Beginner Driver', ar: 'سائق مبتدئ' },
  'reputation.rank.skilled': { en: 'Skilled Driver', ar: 'سائق ماهر' },
  'reputation.rank.advanced': { en: 'Advanced Driver', ar: 'سائق متقدم' },
  'reputation.rank.professional': { en: 'Professional Driver', ar: 'سائق محترف' },
  'reputation.rank.master': { en: 'MASAR Master', ar: 'أسطورة مسار' },
  'reputation.rankUpToast': { en: 'New rank: {0}', ar: 'رتبة جديدة: {0}' },

  // ---- v1.1.0: Traffic Police (Feature 5) ----
  'police.warningToast': { en: 'Police warning: drive safely', ar: 'تحذير من الشرطة: قد بأمان' },
  'police.fineToast': { en: 'Fined by traffic police: -{0} coins', ar: 'غرامة من شرطة المرور: -{0} عملة' },
  'police.violation.speeding': { en: 'Speeding', ar: 'تجاوز السرعة' },
  'police.violation.collision': { en: 'Collision', ar: 'اصطدام' },
  'police.violation.redLight': { en: 'Running a Red Light', ar: 'تجاوز إشارة حمراء' },
  'police.violation.wrongSide': { en: 'Wrong-Side Driving', ar: 'القيادة بالاتجاه المعاكس' },

  // ---- v1.1.0: Expanded License Program (Feature 6) ----
  'license.tier.beginner': { en: 'Beginner License', ar: 'رخصة مبتدئ' },
  'license.tier.intermediate': { en: 'Intermediate License', ar: 'رخصة متوسطة' },
  'license.tier.advanced': { en: 'Advanced License', ar: 'رخصة متقدمة' },
  'license.tier.professional': { en: 'Professional License', ar: 'رخصة احترافية' },
  'license.tier.master': { en: 'Master Driver License', ar: 'رخصة سائق محترف' },
  'license.tierLocked': { en: 'Complete the previous tier to unlock', ar: 'أكمل المستوى السابق للفتح' },
  'license.tierEarnedToast': { en: '{0} earned!', ar: 'تم الحصول على {0}!' },

  // ---- v1.1.0: Player Profile (Feature 8) ----
  'progress.stat.driverRank': { en: 'Driver Rank', ar: 'رتبة السائق' },
  'progress.stat.reputation': { en: 'Reputation', ar: 'السمعة' },
  'progress.stat.driverLevel': { en: 'Driver Level', ar: 'مستوى السائق' },
  'progress.stat.vehiclesOwned': { en: 'Vehicles Owned', ar: 'المركبات المملوكة' },
  'progress.stat.licensesEarned': { en: 'Licenses Earned', ar: 'الرخص المكتسبة' },
  'progress.stat.missionsCompleted': { en: 'Missions Completed', ar: 'المهام المكتملة' },
  'progress.stat.violations': { en: 'Violations', ar: 'المخالفات' },
  'progress.stat.achievementsUnlocked': { en: 'Achievements Unlocked', ar: 'الإنجازات المفتوحة' },
  'progress.leaderboard.title': { en: 'Local Leaderboard', ar: 'لوحة الصدارة المحلية' },
  'progress.leaderboard.bestAccuracy': { en: 'Best Parking Accuracy', ar: 'أفضل دقة اصطفاف' },
  'progress.leaderboard.fastestCompletion': { en: 'Fastest Completion Time', ar: 'أسرع وقت إنجاز' },
  'progress.leaderboard.reputation': { en: 'Highest Reputation', ar: 'أعلى سمعة' },
  'progress.leaderboard.empty': { en: 'No runs recorded yet', ar: 'لا توجد نتائج بعد' },

  // ---- v1.1.0: new vehicles (License tier unlocks) ----
  'vehicle.taxi.name': { en: 'MASAR Taxi', ar: 'تكسي مسار' },
  'vehicle.van.name': { en: 'Delivery Van', ar: 'شاحنة التوصيل' },
  'vehicle.sportscar.name': { en: 'Falcon Sports Car', ar: 'سيارة الصقر الرياضية' },
  'vehicle.hypercar.name': { en: 'Najm Hypercar', ar: 'نجم الخارقة' },
};
