// 利用可能な言語タイプを定義
type Language = 'en' | 'ko' | 'ja';
type TranslationKeys = Record<string, any>;

// 翻訳データをキャッシュして、毎回ロードしないようにする
const translationCache: Record<Language, TranslationKeys | null> = {
    en: null,
    ko: null,
    ja: null
};

/**
 * オブジェクトからパス指定で値を取得する関数
 * 例: getTranslation(obj, 'a.b.c', 'default')
 */
export function getTranslation(obj: any, path: string, defaultValue: string = ''): string {
    // パスを分割して順に辿っていく
    const travel = (regexp: RegExp) =>
        String.prototype.split
            .call(path, regexp)
            .filter(Boolean)
            .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
    // 複数の区切り記号に対応
    const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
    // 結果がなければデフォルト値を返す
    return result === undefined || result === null ? defaultValue : result;
}

/**
 * 初期言語を決定する関数
 * 1. localStorage
 * 2. ブラウザの言語設定
 * 3. デフォルトは'en'
 */
export function getInitialLanguage(): Language {
    const savedLanguage = localStorage.getItem('language') as Language;
    // 保存済みの言語が利用可能ならそれを返す
    if (savedLanguage && ['en', 'ko', 'ja'].includes(savedLanguage)) {
        return savedLanguage;
    }

    // ブラウザの言語設定から判定
    const browserLang = navigator.language.substring(0, 2);
    if (['en', 'ko', 'ja'].includes(browserLang)) {
        return browserLang as Language;
    }

    // どれにも該当しない場合は英語
    return 'en';
}

/**
 * 指定した言語の翻訳ファイルをロード
 * キャッシュがあればそれを返す
 */
async function loadTranslations(language: Language): Promise<TranslationKeys> {
    // 既にキャッシュ済みならそれを返す
    if (translationCache[language]) {
        return translationCache[language]!;
    }

    try {
        // サーバーから翻訳ファイルを取得
        const response = await fetch(`/translation/${language}.json`);
        if (!response.ok) {
            // ファイル取得に失敗した場合のエラーハンドリング
            console.error(`Failed to load translation file: ${language}.json`);
            throw new Error(`HTTP error ${response.status}`);
        }
        // JSONとしてパース
        const translations = await response.json();
        // キャッシュに保存
        translationCache[language] = translations;
        return translations;
    } catch (error) {
        // エラー時は英語にフォールバック
        console.error(`Error loading translations for ${language}:`, error);
        if (language !== 'en') {
            return loadTranslations('en');
        }
        // それでもダメなら空オブジェクト
        return {};
    }
}

/**
 * 言語管理のためのサービスクラス
 */
class LanguageService {
    private currentLanguage: Language;
    private translations: TranslationKeys;
    private listeners: (() => void)[] = [];

    constructor() {
        this.currentLanguage = getInitialLanguage();
        this.translations = {};
        this.init();
    }

    /**
     * 初期化処理: 翻訳データのロード
     */
    private async init() {
        this.translations = await loadTranslations(this.currentLanguage);
        this.notifyListeners();
    }

    /**
     * 現在の言語を取得
     */
    public getCurrentLanguage(): Language {
        return this.currentLanguage;
    }

    /**
     * 言語を変更し、翻訳データを再ロード
     */
    public async setLanguage(language: Language) {
        if (language === this.currentLanguage) return;

        this.currentLanguage = language;
        localStorage.setItem('language', language);
        this.translations = await loadTranslations(language);

        // HTMLのlang属性も変更
        document.documentElement.lang = language;

        this.notifyListeners();
    }

    /**
     * 指定キーの翻訳を取得
     */
    public translate(key: string, defaultValue: string = key): string {
        return getTranslation(this.translations, key, defaultValue);
    }

    /**
     * 言語変更時のリスナーを追加
     */
    public addListener(listener: () => void) {
        this.listeners.push(listener);
    }

    /**
     * リスナーを削除
     */
    public removeListener(listener: () => void) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    /**
     * すべてのリスナーに通知
     */
    private notifyListeners() {
        this.listeners.forEach(listener => listener());
    }
}

// グローバルに言語サービスをエクスポート
export const languageService = new LanguageService();

/**
 * 翻訳取得用のショートカット関数
 */
export function t(key: string, defaultValue: string = key): string {
    return languageService.translate(key, defaultValue);
}