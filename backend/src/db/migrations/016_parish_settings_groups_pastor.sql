-- Migration 016: Add pastor details, visibility settings, and custom ministry groups/tags

INSERT INTO site_settings (key, value)
VALUES
    ('pastor_name', 'Olli-Pekka Silfverhuth'),
    ('pastor_title', 'Kirkkoherra'),
    ('show_pastor_prayer', 'true'),
    ('show_bishop_prayer', 'true'),
    ('ministry_groups', '["Paikallinen seurakuntatyö", "Kansainvälinen vastuu ja lähetys", "Lapset ja nuoret", "Diakonia ja lähimmäispalvelu"]'),
    ('ministry_tags', '["Diakonia", "Nuorisotyö", "Lähetystyö", "Musiikkityö", "Varhaiskasvatus", "Jumalanpalvelus", "Yhteisötyö"]')
ON CONFLICT (key) DO NOTHING;
