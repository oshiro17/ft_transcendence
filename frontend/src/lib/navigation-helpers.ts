import { navigate } from "../router";

export function handleNavigation(event?: Event, destination: string = '/pong-selection'): void {
  if (event) {
    event.preventDefault();
  }

  navigate(destination);
}

export function setupNavigationHandlers(): void {
  const backButtons = document.querySelectorAll('[id^="back-to-modes-button"]');

  backButtons.forEach(originalButton => {
    const clonedButton = originalButton.cloneNode(true) as HTMLElement;
    originalButton.parentNode?.replaceChild(clonedButton, originalButton);

    clonedButton.addEventListener('click', (e) => {
      handleNavigation(e);
    });
  });

  const newGameBtn = document.getElementById('new-game-button');
  if (newGameBtn) {
    newGameBtn.addEventListener('click', () => {
      // Conceal the winner announcement area
      const winnerAnnouncement = document.getElementById("pong-winner-announcement");
      if (winnerAnnouncement) {
        winnerAnnouncement.classList.add("hidden");
      }

      const playBtn = document.getElementById("play-button");
      if (playBtn) {
        playBtn.click();
      }
    });
  }


  const customBackBtn = document.getElementById('custom-back-button');

  if (customBackBtn) {
    customBackBtn.addEventListener('click', () => {
      const mainMenu = document.getElementById('pong-menu');
      const customMenu = document.getElementById('pong-custom-menu');

      if (mainMenu && customMenu) {
        customMenu.classList.add('fade-out');

        setTimeout(() => {
          customMenu.classList.add('hidden');
          customMenu.classList.remove('fade-out');
          mainMenu.classList.remove('hidden');

          mainMenu.classList.add('fade-in');

          setTimeout(() => {
            mainMenu.classList.remove('fade-in');
          }, 300);
        }, 300);
      }
    });
  }

  const customizeButton = document.getElementById('customize-button');

  if (customizeButton) {
    customizeButton.addEventListener('click', () => {
      const mainMenu = document.getElementById('pong-menu');
      const customMenu = document.getElementById('pong-custom-menu');

      if (mainMenu && customMenu) {
        mainMenu.classList.add('fade-out');

        setTimeout(() => {
          mainMenu.classList.add('hidden');
          mainMenu.classList.remove('fade-out');
          customMenu.classList.remove('hidden');

          customMenu.classList.add('fade-in');

          setTimeout(() => {
            customMenu.classList.remove('fade-in');
          }, 300);
        }, 300);
      }
    });
  }
}

export function preloadImages(imagePaths: string[]): void {
  imagePaths.forEach(src => {
    const image = new Image();
    image.src = src;
  });
}

export function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000): void {
  let toastArea = document.getElementById('toast-container');
  if (!toastArea) {
    toastArea = document.createElement('div');
    toastArea.id = 'toast-container';
    toastArea.style.right = '20px';
    toastArea.style.bottom = '20px';
    toastArea.style.position = 'fixed';
    toastArea.style.zIndex = '9999';
    document.body.appendChild(toastArea);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.marginBottom = '10px';
  toast.style.padding = '12px 20px';
  toast.style.color = 'white';
  toast.style.borderRadius = '4px';
  toast.style.backgroundColor =
    type === 'success' ? '#4CAF50' :
    type === 'error' ? '#F44336' :
    '#2196F3';
  toast.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(20px)';
  toast.style.transition = 'opacity 0.3s, transform 0.3s';
  toast.textContent = message;

  toastArea.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';

    setTimeout(() => {
      toastArea?.removeChild(toast);
    }, 300);
  }, duration);
}