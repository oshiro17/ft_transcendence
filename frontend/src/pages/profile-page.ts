import "./profile-page.css";
import { getCurrentUser } from "../lib/utils";
import { navigate } from "../router";
import { languageService } from "../lib/languageContext";

function updateButtonTranslations(): void {
    /* ── ① ログアウトボタン ───────────────────────── */
    // <button class="btn btn-log-out">ログアウト</button>
    // const logoutButton = document.querySelector('.btn-log-out') as HTMLElement | null;
    // if (logoutButton) {
    //   logoutButton.textContent = languageService.translate('profile.logout', 'Log out');
    // }

    // --- ログアウトボタンにクリックイベントを追加 ---
    const logoutButton = document.querySelector('.btn-log-out') as HTMLElement | null;
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
  
    /* ── ② プロフィール編集リンク ─────────────────── */
    // <button class="btn btn-profile-edit"><a href="/profile-edit">Edit</a></button>
    // ここでは <a> 要素だけを取得してテキストを上書きする
    const editProfileLink = document.querySelector('.btn-profile-edit ') as HTMLElement | null;
    if (editProfileLink) {
      editProfileLink.textContent = languageService.translate('profile.edit', 'Edit profile');
    }
  }

    function updatePageTranslations(): void {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
          const key = element.getAttribute('data-i18n');
          if (key) {
            element.textContent = languageService.translate(key);
          }
        });
        
        updateButtonTranslations();
    }

    async function loadGameHistory(): Promise<void> {
        try {
        const response = await fetch('/api/game-history', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Error retrieving history');
        }
        
        const gameHistory = await response.json();
        
        const historyTable = document.querySelector('#tab-history .score-table');
        if (!historyTable) return;
        
        const tbody = historyTable.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        const thead = historyTable.querySelector('thead');
        if (thead && thead.innerHTML.trim() === '') {
            thead.innerHTML = `
            <tr>
                <th>${languageService.translate('profile.history.date','Date')}</th>
                <th>${languageService.translate('profile.history.opponent','Opponent')}</th>
                <th>${languageService.translate('profile.history.result','Result')}</th>
                <th>${languageService.translate('profile.history.winner','Winner')}</th>
            </tr>
            `;
            updatePageTranslations();
        }
        
        if (gameHistory.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="4" class="no-data">${languageService.translate('profile.history.no_data','No game history')}</td>
            </tr>
            `;
        } else {
            gameHistory.forEach((game: any) => {
            const row = document.createElement('tr');
            row.className = game.result.toLowerCase();
            
            const date = new Date(game.played_at);
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            
            let winner = '';
            if (game.result === 'WIN') {
                winner = 'You';
                row.classList.add('win-row');
            } else if (game.result === 'LOSS') {
                winner = game.opponent_type === 'AI' ? 'AI' : game.opponent_name || 'Opponent';
                row.classList.add('loss-row');
            } else {
                winner = 'Draw';
            }
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${game.opponent_type === 'AI' ? `AI (${game.difficulty})` : game.opponent_name || 'Player'}</td>
                <td>${game.user_score} - ${game.opponent_score}</td>
                <td class="winner ${game.result.toLowerCase()}">${winner}</td>
            `;
            
            tbody.appendChild(row);
            });
        }

        initializeHistoryTable();
        } catch (error) {
        console.error('Error loading game history:', error);
        }
    }

function updateProfileInfo(user: any): void {
    const usernameElement = document.querySelector('.profile-info .username');
    const nameElement = document.querySelector('.profile-info .name');

    if (usernameElement) {
        usernameElement.textContent = user.username;
    }

    if (nameElement) {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        nameElement.textContent = fullName;
    }
   
}
    async function initializeProfilePage(): Promise<() => void> {
        updatePageTranslations();
        window.addEventListener('languageChanged', updatePageTranslations);

        const user = await getCurrentUser();

        if (user) {
            updateProfileInfo(user);
            await loadGameHistory();
            updateButtonTranslations();
        }

        const tabLinks = document.querySelectorAll<HTMLElement>('.tab-link');
        const tabContents = document.querySelectorAll<HTMLElement>('.tab-content');
        
        function handleTabClick(this: HTMLElement): void {
            tabLinks.forEach(tab => tab.classList.remove('active'));
            tabContents.forEach(content => {
                content.classList.remove('active');
                content.classList.add('fade-out');
            });
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            if (tabId) {
                const content = document.getElementById(tabId);
                if (content) {
                    setTimeout(() => {
                        content.classList.remove('fade-out');
                        content.classList.add('active', 'fade-in');
                        if (tabId === 'tab-history') {
                            animateHistoryTable();
                        }
                        
                        // Refresh translations when changing tabs
                        updatePageTranslations();
                    }, 150);
                }
            }
        }
        
        tabLinks.forEach(link => link.addEventListener('click', handleTabClick));
        initializeHistoryTable();
        
        return () => {
            tabLinks.forEach(link => link.removeEventListener('click', handleTabClick));
            const historyRows = document.querySelectorAll('#tab-history tbody tr');
            historyRows.forEach(row => {
                row.removeEventListener('mouseenter', handleHistoryRowHover);
                row.removeEventListener('mouseleave', handleHistoryRowLeave);
            });

            window.removeEventListener('languageChanged', updatePageTranslations);
        };
    }
    let handleHistoryRowHover: (this: HTMLElement, event: Event) => void;
    let handleHistoryRowLeave: (this: HTMLElement, event: Event) => void;
    let animateHistoryTable: () => void;

    function initializeHistoryTable(): void {
        const historyTab = document.getElementById('tab-history');
        if (!historyTab) return;
        const rows = historyTab.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            if (row.classList.contains('win')) {
                row.classList.add('win-row');
            } else if (row.classList.contains('loss')) {
                row.classList.add('loss-row');
            } else if (row.classList.contains('draw')) {
                row.classList.add('draw-row');
            }
            
            row.classList.add('animated-row');
            (row as HTMLElement).style.opacity = '0';
            (row as HTMLElement).style.transform = 'translateY(20px)';
        });
        
        handleHistoryRowHover = function(this: HTMLElement, event: Event) {
            // Do nothing on hover
        };
        
        handleHistoryRowLeave = function(this: HTMLElement, event: Event) {
            // Do nothing when leaving hover
        };
        
        rows.forEach(row => {
            row.addEventListener('mouseenter', handleHistoryRowHover);
            row.addEventListener('mouseleave', handleHistoryRowLeave);
        });
        const headerCells = historyTab.querySelectorAll('thead th');
        headerCells.forEach((header, index) => {
            (header as HTMLElement).style.cursor = 'pointer';
            header.setAttribute('data-sort-direction', 'none');
            header.addEventListener('click', () => sortTable(index, header));
        });
        const headerRow = historyTab.querySelector('thead tr');
        if (headerRow) {
            headerRow.classList.add('header-row-animated');
        }
        animateHistoryTable = () => {
            rows.forEach(row => {
                (row as HTMLElement).style.opacity = '0';
                (row as HTMLElement).style.transform = 'translateY(20px)';
                (row as HTMLElement).style.transition = 'none';
            });
            void historyTab.offsetWidth;
            if (headerRow) {
                headerRow.classList.add('header-active');
            }
            rows.forEach((row, index) => {
                setTimeout(() => {
                    (row as HTMLElement).style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    (row as HTMLElement).style.opacity = '1';
                    (row as HTMLElement).style.transform = 'translateY(0)';
                }, 150 + (index * 100));
            });
        };
        if (historyTab.classList.contains('active')) {
            setTimeout(animateHistoryTable, 300);
        }
    }

    function sortTable(columnIndex: number, headerElement: Element): void {
        const historyTable = document.querySelector('#tab-history table');
        if (!historyTable)
            return;
        
        const tbody = historyTable.querySelector('tbody');
        if (!tbody)
            return;
        const currentDirection = headerElement.getAttribute('data-sort-direction') || 'none';
        const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
        const allHeaders = historyTable.querySelectorAll('thead th');
        allHeaders.forEach(header => {
            header.setAttribute('data-sort-direction', 'none');
            header.classList.remove('sorted-asc', 'sorted-desc');
        });
        headerElement.setAttribute('data-sort-direction', newDirection);
        headerElement.classList.add(newDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        rows.sort((rowA, rowB) => {
            const cellA = rowA.cells[columnIndex].textContent?.trim() || '';
            const cellB = rowB.cells[columnIndex].textContent?.trim() || '';
            if (columnIndex === 0) {
                const dateA = new Date(cellA).getTime();
                const dateB = new Date(cellB).getTime();
                return newDirection === 'asc' ? dateA - dateB : dateB - dateA;
            }
            if (columnIndex === 2) {
                const isWinA = rowA.classList.contains('win-row');
                const isWinB = rowB.classList.contains('win-row');
                if (isWinA === isWinB) return 0;
                if (newDirection === 'asc') {
                    return isWinA ? -1 : 1;
                } else {
                    return isWinA ? 1 : -1;
                }
            }
            const comparison = cellA.localeCompare(cellB);
            return newDirection === 'asc' ? comparison : -comparison;
        });
        tbody.classList.add('sorting');
        setTimeout(() => {
            rows.forEach((row, index) => {
                (row as HTMLElement).style.opacity = '0';
                (row as HTMLElement).style.transform = 'translateY(10px)';
                tbody.appendChild(row);
                setTimeout(() => {
                    (row as HTMLElement).style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    (row as HTMLElement).style.opacity = '1';
                    (row as HTMLElement).style.transform = 'translateY(0)';
                }, 50 * index);
            });
            setTimeout(() => {
                tbody.classList.remove('sorting');
            }, rows.length * 50 + 300);
        }, 300);
    }


    if (document.readyState !== 'loading') {
        initializeProfilePage();
    } else {
        document.addEventListener('DOMContentLoaded', initializeProfilePage);
    }


    export async function handleLogout(): Promise<void> {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include',
            });

            if (!response.ok) {
                console.warn('Server logout failed, continuing with client-side logout');
            }
            
            localStorage.removeItem('token');
            
            document.cookie = 'sessionid=; Max-Age=0; path=/;';
            document.cookie = 'auth_token=; Max-Age=0; path=/;';
            
            document.cookie = 'sessionid=; Max-Age=0; path=/; domain=' + window.location.hostname;
            document.cookie = 'auth_token=; Max-Age=0; path=/; domain=' + window.location.hostname;
            
            const profileLabel = document.querySelector(".profile-label") as HTMLElement;
            if (profileLabel) {
                profileLabel.textContent = "Login";
                profileLabel.setAttribute("data-hover", "Login");
            }
            
            setTimeout(() => {
                navigate('/');
            }, 100);
            
        } catch (error) {
            console.error('Error during logout:', error);
            navigate('/');
        }
    }

    export default initializeProfilePage;