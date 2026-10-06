-- Built-in marker catalogue available in every campaign. Masters can add campaign-specific types on top.
insert into marker_types (campaign_id, name, shape, color, icon, sort_order) values
    (null, 'Город / район',          'HEXAGON',  '#3B82F6', '🏙', 10),
    (null, 'Штаб-квартира корпорации', 'SQUARE', '#F59E0B', '🏢', 20),
    (null, 'Убежище',                'SHIELD',   '#22C55E', '🛡', 30),
    (null, 'Бар / клуб',             'CIRCLE',   '#EC4899', '🍸', 40),
    (null, 'Контакт / фиксер',       'PIN',      '#A855F7', '🤝', 50),
    (null, 'Магазин / торговец',     'CIRCLE',   '#14B8A6', '🛒', 60),
    (null, 'Опасная зона',           'TRIANGLE', '#EF4444', '☠', 70),
    (null, 'Территория банды',       'DIAMOND',  '#F97316', '⚔', 80),
    (null, 'Полиция / охрана',       'SHIELD',   '#1D4ED8', '🚨', 90),
    (null, 'Матрица / хост',         'DIAMOND',  '#06B6D4', '💾', 100),
    (null, 'Магическое место',       'STAR',     '#8B5CF6', '✨', 110),
    (null, 'Цель задания',           'STAR',     '#FACC15', '🎯', 120),
    (null, 'Тайник / лут',           'SQUARE',   '#84CC16', '📦', 130),
    (null, 'Транспорт',              'HEXAGON',  '#64748B', '🚇', 140),
    (null, 'Медицина / рипердок',     'CIRCLE',  '#F43F5E', '⚕', 150),
    (null, 'Заметка мастера',        'PIN',      '#94A3B8', '📝', 160);
