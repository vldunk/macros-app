function escapeHTML(value) {
            return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
        }

function escapeAttr(value) { return escapeHTML(value).replace(/`/g, '&#96;'); }

function encodeData(value) { return escapeAttr(String(value ?? '')); }

function safeImageUrl(value) {
            if (!value) return '';
            try {
                const url = new URL(String(value), window.location.href);
                return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
            } catch (e) { return ''; }
        }

function inferIngredientUnit(name, amount, unit) {
            const explicit = String(unit || '').toLowerCase().trim();
            const n = String(name || '').toLowerCase();
            if (['шт', 'pcs', 'piece'].includes(explicit)) return { amount: Number(amount) || 0, unit: 'шт' };
            if (['мл', 'ml', 'л', 'l'].includes(explicit)) return { amount: explicit === 'л' || explicit === 'l' ? (Number(amount) || 0) * 1000 : Number(amount) || 0, unit: 'мл' };
            if (['г', 'гр', 'g', 'kg', 'кг', 'gram', 'grams'].includes(explicit)) return { amount: explicit === 'kg' || explicit === 'кг' ? (Number(amount) || 0) * 1000 : Number(amount) || 0, unit: 'г' };
            const value = Number(amount) || 0;
            const pieceMap = [
                { re: /(яйц|egg)/, grams: 55 },
                { re: /(банан)/, grams: 120 },
                { re: /(яблок)/, grams: 160 },
                { re: /(апельсин)/, grams: 170 },
                { re: /(авокадо)/, grams: 150 },
                { re: /(огурец|огурц)/, grams: 100 },
                { re: /(помидор|томат)/, grams: 120 }
            ];
            const piece = pieceMap.find(item => item.re.test(n));
            if (piece) return { amount: Math.max(1, Math.round(value / piece.grams)), unit: 'шт' };
            if (/(молок|кефир|йогурт пить|вода|сок|сливк)/.test(n)) return { amount: value, unit: 'мл' };
            return { amount: value, unit: 'г' };
        }

function normalizeIngredientUnit(amount, unit, name = '') {
            return inferIngredientUnit(name, amount, unit);
        }

function formatIngredientAmount(amount, unit) {
            const value = Number(amount) || 0;
            if (unit === 'г' && value >= 1000) return (Math.round(value / 100) / 10).toLocaleString('ru-RU') + ' кг';
            if (unit === 'мл' && value >= 1000) return (Math.round(value / 100) / 10).toLocaleString('ru-RU') + ' л';
            return Math.round(value).toLocaleString('ru-RU') + ' ' + unit;
        }

function getIngredientCategory(name) {
            const n = String(name || '').toLowerCase();
            if (/(кур|индей|говяд|мяс|фарш|филе)/.test(n)) return 'мясо / птица';
            if (/(рыб|тунец|лосос|кревет)/.test(n)) return 'рыба';
            if (/(творог|йогурт|сыр|молок|кефир)/.test(n)) return 'молочные продукты';
            if (/(рис|греч|овся|круп|булгур|паста|макарон|киноа)/.test(n)) return 'крупы';
            if (/(томат|огур|капуст|морков|лук|перец|овощ|салат|зелень)/.test(n)) return 'овощи';
            if (/(яблок|банан|ягод|фрукт|апельсин)/.test(n)) return 'фрукты';
            if (/(орех|минд|арах|семеч)/.test(n)) return 'орехи';
            if (/(соль|перец|паприк|спец|соус|масло)/.test(n)) return 'специи';
            return 'другое';
        }

function parseAmountInput(value, fallbackUnit = 'г') {
            const raw = String(value || '').replace(',', '.');
            const amount = parseFloat(raw) || 0;
            const unit = raw.includes('кг') ? 'г' : raw.includes('л') && !raw.includes('мл') ? 'мл' : raw.includes('шт') ? 'шт' : raw.includes('мл') ? 'мл' : fallbackUnit;
            return { amount: raw.includes('кг') ? amount * 1000 : (raw.includes('л') && !raw.includes('мл')) ? amount * 1000 : amount, unit };
        }

