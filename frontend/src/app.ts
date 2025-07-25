import './pages/globals.css'; // グローバルなCSSを読み込み
import './pages/404.css'; // 404ページ用CSSを読み込み
import { navigate, checkAuthStatus, preloadCommonPages } from './router'; // ルーター関連
import { languageService, getInitialLanguage } from './lib/languageContext'; // 多言語サービス
import { createLanguageSwitcher } from './components/languageSwitcher'; // 言語切替コンポーネント

// プロフィールラベルの文言を認証状態に応じて切り替える
export const changeProfileLabel = (): void => {
  const profileLabel = document.querySelector(".profile-label") as HTMLElement;
  
  if (profileLabel) {
    const isAuth = localStorage.getItem('token') !== null;
    
    if (isAuth) {
      profileLabel.textContent = languageService.translate("nav.profile", "Profile");
      profileLabel.setAttribute("data-hover", languageService.translate("nav.profile", "Profile"));
    } else {
      profileLabel.textContent = languageService.translate("profile.login", "Login");
      profileLabel.setAttribute("data-hover", languageService.translate("profile.login", "Login"));
    }
  }
};

// 初期処理：ページ読み込み後に実行
document.addEventListener('DOMContentLoaded', async () => {
  // OAuth認証成功メッセージを受け取る処理
  window.addEventListener('message', async (event) => {
    if (event.origin !== window.location.origin) return;
    
    if (event.data === 'auth-success') {
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          
          if (userData.avatar) {
            localStorage.setItem('userAvatar', userData.avatar);
          }
          
          localStorage.setItem('token', 'authenticated');
          changeProfileLabel();
          
          window.location.href = '/home';
        }
      } catch (error) {
        console.error('Error fetching user data after OAuth login:', error);
      }
    }
  });

  const initialLang = getInitialLanguage();
  document.documentElement.lang = initialLang;
  await languageService.setLanguage(initialLang);
  
  // Add language switcher to the DOM
  const languageSwitcher = createLanguageSwitcher();
  document.body.appendChild(languageSwitcher);
  
  window.addEventListener('languageChanged', async () => {
    await navigate();
  });
  
  await checkAuthStatus();
  
  initializeNavbarAnimation();
  
  await navigate();
  
  preloadCommonPages();
  
  initializeBurgerMenu();
});

// ナビゲーションバーのアニメーション初期化
const initializeNavbarAnimation = (): void => {
  const nav = document.querySelector(".nav");
  
  changeProfileLabel();

  if (nav) {
    setTimeout(() => {
      nav.classList.add("in");
    }, 300);
  }
  
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const page = link.getAttribute('data-page');
    if (page === 'home') {
      link.querySelector('span')!.textContent = languageService.translate('nav.home', 'Home');
    } else if (page === 'profile-page') {
      link.querySelector('span')!.textContent = languageService.translate('nav.profile', 'Profile');
    }
  });
};

// ハンバーガーメニューの動作を初期化
const initializeBurgerMenu = (): void => {
  const burgerButton = document.querySelector<HTMLButtonElement>('.burger-menu-button');
  const burgerMenu = document.querySelector<HTMLDivElement>('.ham-menu');

  if (burgerButton && burgerMenu) {
    // 既存のボタンをクローンしたボタンに置き換え
    const newBurger = burgerButton.cloneNode(true) as HTMLButtonElement;
    burgerButton.parentNode?.replaceChild(newBurger, burgerButton);
    
    // メニューボタンを押したときの開閉処理
    newBurger.addEventListener('click', () => {
      newBurger.classList.toggle('opened');
      const isOpened = newBurger.classList.contains('opened');
      newBurger.setAttribute('aria-expanded', isOpened.toString());
      
      if (isOpened) {
        burgerMenu.classList.remove('hidden');
      } else {
        burgerMenu.classList.add('hidden');
      }
    });
    
    // メニュー内リンククリック時の処理
    const menuLinks = burgerMenu.querySelectorAll('a');
    menuLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          // Close menu before navigating
          burgerMenu.classList.add('hidden');
          newBurger.classList.remove('opened');
          newBurger.setAttribute('aria-expanded', 'false');
          
          navigate(href);
        }
      });
    });
  }
};