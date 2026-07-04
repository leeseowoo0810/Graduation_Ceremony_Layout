/**
 * 수료식 배치도 조회 시스템 - script.js
 *
 * 주요 기능:
 * 1. data.json fetch로 데이터 로드 (response.ok 체크 포함)
 *    → 로컬 file:// 실행 또는 fetch 실패 시 fallbackData 자동 대체
 * 2. DocumentFragment를 활용한 고속 DOM 렌더링 (그리드 생성)
 * 3. 메인 선택 화면과 중대별 확장 상세 화면의 스위칭 제어
 * 4. 훈련병 조회 및 위치 자동 확대, 타겟 좌석 하이라이트/스크롤 연동
 */

let data = null;

/* ==========================================================================
   ⚠️  fallbackData: data.json을 불러오지 못할 경우(로컬 실행 등)에만 사용됩니다.
       data.json을 수정했다면 이 fallbackData도 반드시 함께 동기화하세요.
   ========================================================================== */
const fallbackData = {
    layout: {
        "9":  { columns: 10, lines: 20 },
        "10": { columns: 4,  lines: 14 },
        "11": { columns: 4,  lines: 14 },
        "12": { columns: 4,  lines: 14 }
    },
    soldiers: [
        { company: "9",  number: "001", name: "이승우", phone: "123", position: "2-7"  },
        { company: "10", number: "015", name: "김민재", phone: "456", position: "3-5"  },
        { company: "11", number: "088", name: "손흥민", phone: "789", position: "1-10" },
        { company: "12", number: "104", name: "황희찬", phone: "012", position: "4-2"  }
    ]
};

// DOM 캐시 객체
const DOM = {
    companySelect: null,
    nameInput: null,
    phoneInput: null,
    searchBtn: null,
    backBtn: null,
    resultCard: null,
    resultBody: null,
    selectionView: null,
    detailView: null,
    activeTitle: null,
    companyWrappers: {}
};

// 페이지 로드 시 라이프사이클 시작
window.addEventListener("DOMContentLoaded", async () => {
    cacheDOMElements();
    await loadDatabase();
});

/**
 * 자주 사용되는 DOM 엘리먼트들을 미리 캐싱
 */
function cacheDOMElements() {
    DOM.companySelect  = document.getElementById("company");
    DOM.nameInput      = document.getElementById("nameInput");
    DOM.phoneInput     = document.getElementById("phoneInput");
    DOM.searchBtn      = document.getElementById("searchBtn");
    DOM.backBtn        = document.getElementById("backBtn");
    DOM.resultCard     = document.getElementById("resultCard");
    DOM.resultBody     = document.getElementById("resultBody");
    DOM.selectionView  = document.getElementById("selectionView");
    DOM.detailView     = document.getElementById("detailView");
    DOM.activeTitle    = document.getElementById("activeTitle");

    for (let c = 9; c <= 12; c++) {
        DOM.companyWrappers[c] = document.getElementById("wrapper" + c);
    }
}

/**
 * data.json을 fetch로 읽어옵니다.
 * - response.ok가 false(404 등)이면 명시적으로 에러를 던집니다.
 * - fetch 자체가 실패하거나(로컬 file:// CORS 등) 파싱 오류 시 fallbackData를 사용합니다.
 */
async function loadDatabase() {
    try {
        const response = await fetch("./data.json");

        // ★ 핵심 수정: HTTP 상태 코드 체크 (404, 500 등 모두 잡아냄)
        if (!response.ok) {
            throw new Error(`data.json 로드 실패 (HTTP ${response.status})`);
        }

        data = await response.json();
        console.log("✅ data.json 로드 성공:", data);

    } catch (error) {
        console.warn("⚠️ data.json 로드 실패, fallbackData를 사용합니다:", error.message);
        data = fallbackData;
    }

    // 성공/실패 무관하게 항상 실행
    if (data && data.layout) {
        createLayouts();
        initEventListeners();
    } else {
        showError("데이터를 불러오는 데 실패했습니다. 새로고침해 주세요.");
    }
}

/**
 * 각 중대의 그리드 배치도 생성 (DocumentFragment로 성능 최적화)
 */
function createLayouts() {
    for (const company in data.layout) {
        const companyBox = document.getElementById("company" + company);
        if (!companyBox) continue;

        const { columns, lines } = data.layout[company];

        // CSS Grid 열 비율 적용
        companyBox.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

        // 리플로우 방지를 위한 DocumentFragment 생성
        const fragment = document.createDocumentFragment();

        for (let line = 1; line <= lines; line++) {
            for (let column = 1; column <= columns; column++) {
                const seat = document.createElement("div");
                seat.className = "seat";
                seat.dataset.company = company;
                seat.dataset.position = `${column}-${line}`;
                seat.textContent = `${column}-${line}`;
                fragment.appendChild(seat);
            }
        }
        companyBox.appendChild(fragment);
    }
}

/**
 * 이벤트 리스너 등록
 */
function initEventListeners() {
    // 중대 선택 버튼 클릭 시 해당 중대 확장
    document.querySelectorAll(".comp-select-btn").forEach(button => {
        button.addEventListener("click", () => {
            showCompany(button.dataset.target);
        });
    });

    // 이전으로 돌아가기 버튼 클릭
    DOM.backBtn.addEventListener("click", showSelectionView);

    // 검색 클릭
    DOM.searchBtn.addEventListener("click", searchPerson);

    // 엔터키 입력 시 검색 연동
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const activeId = document.activeElement.id;
            if (["nameInput", "phoneInput", "company"].includes(activeId)) {
                searchPerson();
            }
        }
    });

    // 드롭다운 변경 시 해당 중대 버튼 강조 표시 (화면 전환 없음)
    DOM.companySelect.addEventListener("change", function () {
        document.querySelectorAll(".comp-select-btn").forEach(btn => {
            btn.classList.remove("highlighted");
        });

        if (this.value) {
            const targetBtn = document.querySelector(`.comp-select-btn[data-target="${this.value}"]`);
            if (targetBtn) targetBtn.classList.add("highlighted");
        }
    });
}

/**
 * 특정 중대 배치도를 확장해서 보여주는 제어 함수
 */
function showCompany(company) {
    clearHighlights();

    DOM.companySelect.value = company;
    DOM.selectionView.style.display = "none";
    DOM.detailView.style.display = "block";
    DOM.activeTitle.textContent = `${company}중대 배치도`;

    for (const c in DOM.companyWrappers) {
        if (DOM.companyWrappers[c]) {
            DOM.companyWrappers[c].style.display = (c === company) ? "block" : "none";
        }
    }
}

/**
 * 메인 선택 화면으로 전환하는 제어 함수
 */
function showSelectionView() {
    clearHighlights();

    DOM.companySelect.value = "";
    DOM.detailView.style.display = "none";
    DOM.selectionView.style.display = "block";
    DOM.resultCard.style.display = "none";
    DOM.resultBody.innerHTML = "이름과 전화번호를 입력해주세요.";
}

/**
 * 기존 좌석 및 중대 버튼 하이라이트 제거
 */
function clearHighlights() {
    document.querySelectorAll(".seat.selected-seat").forEach(seat => {
        seat.classList.remove("selected-seat");
    });
    document.querySelectorAll(".comp-select-btn.highlighted").forEach(btn => {
        btn.classList.remove("highlighted");
    });
}

/**
 * 훈련병 검색 로직 및 스크롤 포커싱
 */
function searchPerson() {
    const company = DOM.companySelect.value;
    const name    = DOM.nameInput.value.trim();
    const phone   = DOM.phoneInput.value.trim();

    if (!name || !phone) {
        showError("이름과 전화번호를 모두 입력해 주세요.");
        return;
    }

    clearHighlights();

    const found = data.soldiers.find(s => {
        const companyMatch = !company || s.company === company;
        return companyMatch && s.name === name && s.phone === phone;
    });

    DOM.resultCard.style.display = "block";

    if (!found) {
        DOM.resultBody.innerHTML = `
        <div style="text-align: center; padding: 10px 0;">
            <div style="font-size: 17px; font-weight: 700; color: #f87171; margin-bottom: 8px;">
                일치하는 정보가 없습니다.
            </div>
            <div style="font-size: 13.5px; color: #9ca3af; line-height: 1.6;">
                중대를 모르시는 경우에는 메인 화면으로 돌아가<br>
                <strong style="color: #f3f4f6;">중대 선택 없이 이름과 전화번호만</strong> 입력 후 조회해 보세요.
            </div>
        </div>
        `;
        return;
    }

    DOM.resultBody.innerHTML = `
    <div class="result-details">
        <div class="result-name">${found.name}</div>
        <div class="result-meta">${found.company}중대 · 교번 ${found.number}</div>
        <div class="result-location">📍 위치 : ${found.position}</div>
    </div>
    `;

    showCompany(found.company);

    const seat = document.querySelector(
        `.seat[data-company="${found.company}"][data-position="${found.position}"]`
    );

    if (seat) {
        seat.classList.add("selected-seat");
        setTimeout(() => {
            seat.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 120);
    }
}

/**
 * 에러 메시지 팝업 출력 보조 함수
 */
function showError(msg) {
    DOM.resultCard.style.display = "block";
    DOM.resultBody.innerHTML = `
    <div style="color: #f87171; font-weight: 600; text-align: center; padding: 5px 0;">
        ⚠️ ${msg}
    </div>`;
}
