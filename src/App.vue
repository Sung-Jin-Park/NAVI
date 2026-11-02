<template>
  <div class="curator-app">
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>

    <section class="device-frame wide-frame">
      <div class="glow glow-a"></div><div class="glow glow-b"></div>

      <header class="app-header">
        <div class="header-left">
          <button class="icon-button" aria-label="도시 선택" @click="isSidebarOpen = true">☰</button>
          <div>
            <div class="region-title"><span>{{ currentRegion.icon }}</span><h1>{{ currentRegion.name }}</h1></div>
            <p>실시간 인기 플레이스 모음집</p>
          </div>
        </div>
        <div class="header-actions"><button class="ai-button" @click="openCurator">✨ AI 추천</button><button class="add-button" aria-label="장소 등록" @click="openRegister">＋</button></div>
      </header>

      <div class="region-strip">
        <button v-for="region in regions" :key="region.id"
                :class="{ selected: selectedCityId === region.id }"
                @click="selectCity(region.id)">
          <span>{{ region.icon }}</span><b>{{ region.shortName }}</b>
          <small>{{ cityCounts[region.id] || 0 }}</small>
        </button>
      </div>

      <div class="search-area search-area-advanced">
        <select class="top-region-select" v-model="selectedCityId" aria-label="지역 선택">
          <option value="all">전체</option>
          <option v-for="region in regions" :key="region.id" :value="region.id">{{ region.name }}</option>
        </select>
        <input v-model="searchInput" @keydown.enter="runSearch" :placeholder="`${selectedCityId === 'all' ? '전국' : currentRegion.shortName} 맛집, 카페, 명소 검색...`">
        <button class="search-submit" aria-label="검색" :disabled="liveSearchLoading" @click="runSearch">{{ liveSearchLoading ? '…' : '⌕' }}</button>
        <button class="api-key-toggle" aria-label="실시간 검색 API 설정" @click="showApiKeyInput = !showApiKeyInput">⚙</button>
        <button v-if="searchInput || searchQuery || livePlaces.length" aria-label="검색 초기화" @click="clearSearch">×</button>
      </div>
      <div v-if="showApiKeyInput" class="api-key-panel">
        <input v-model.trim="kakaoAppKeyInput" type="password" placeholder="카카오 JavaScript 키 입력">
        <button @click="saveKakaoKey">키 저장</button>
        <small>카카오 개발자 콘솔에서 JavaScript 키를 발급하고 현재 사이트 도메인을 등록하세요[span_0](start_span)[span_0](end_span).</small>
      </div>

      <div v-if="liveSearchMessage" class="live-search-message">{{ liveSearchMessage }}</div>
      <main class="place-feed">
        <div v-if="activeTab === 'saved'" class="feed-heading"><strong>♡ 보관함</strong><button @click="activeTab = 'explore'">탐색으로 돌아가기</button></div>
        <div v-if="visiblePlaces.length === 0" class="empty-state">
          <div>⌖</div><h3>등록된 시크릿 장소가 없어요</h3>
          <p>＋ 버튼을 눌러 {{ currentRegion.name }}의 숨은 첫 번째 장소를 제보해 주세요!</p>
          <button class="primary-button" @click="openRegister">＋ 첫 명소 등록하기</button>
        </div>

        <article v-for="place in visiblePlaces" :key="place.id" class="place-card">
          <div class="place-image">
            <img :src="place.image" :alt="place.name" loading="lazy"
                 @error="onImageError">
            <div class="image-shade"></div>
            <span class="category-label">{{ place.category }}</span>
            <button class="like-button" :class="{ liked: likedPlaceIds.includes(place.id) }"
                    @click="toggleLike(place.id)">
              {{ likedPlaceIds.includes(place.id) ? '♥' : '♡' }}
            </button>
            <span class="rating">★ {{ Number(place.rating || 0).toFixed(1) }}</span>
          </div>
          <div class="place-info">
            <h2>{{ place.name }}</h2>
            <p class="description">{{ place.description }}</p>
            <div v-if="place.tags && place.tags.length" class="tags">
              <span v-for="(tag, index) in place.tags" :key="index">#{{ tag }}</span>
            </div>
            <div class="place-footer">
              <div class="address">⌖ <span>{{ place.address }}</span></div>
              <div class="place-actions"><button class="edit-place-button" @click="editPlace(place)">✎ 수정</button><button class="delete-place-button" @click="deletePlace(place)">× 삭제</button><button class="navigation-button" @click="openNavigation(place)">➤ 길찾기</button></div>
            </div>
          </div>
        </article>
      </main>

      <nav class="bottom-nav">
        <button :class="{ 'nav-active': activeTab === 'explore' }" @click="resetExplore">◎<small>탐색</small></button>
        <button :class="{ 'nav-active': isSidebarOpen }" @click="isSidebarOpen = true">▤<small>전국도시</small></button>
        <button @click="openRegister">＋<small>등록</small></button>
        <button :class="{ 'nav-active': activeTab === 'saved' }" @click="showSaved">♡<em v-if="likedPlaceIds.length">{{ likedPlaceIds.length }}</em><small>보관함</small></button>
      </nav>

      <div v-if="isCuratorOpen" class="overlay modal-overlay" @click.self="isCuratorOpen = false">
        <section class="curator-modal">
          <header class="modal-heading"><div><strong>✨ AI 큐레이터</strong><small>{{ currentRegion.name }}의 장소를 로컬에서 분석해 추천합니다</small></div><button @click="isCuratorOpen = false">×</button></header>
          <div class="curator-content">
            <label class="curator-region-label">추천 지역</label><select class="curator-region-select" v-model="curatorRegionId"><option v-for="region in regions" :key="region.id" :value="region.id">{{ region.name }}</option></select>
            <p class="curator-note">서버 연결 없이 장소의 설명·태그·평점을 바탕으로 추천합니다[span_1](start_span)[span_1](end_span).</p>
            <div class="curator-controls"><button v-for="mood in curatorMoods" :key="mood" :class="{ active: curatorMood === mood }" @click="curatorMood = mood">{{ mood }}</button></div>
            <article v-for="place in curatorRecommendations" :key="place.id" class="curator-result">
              <img :src="place.image" :alt="place.name" @error="onImageError">
              <div><strong>{{ place.name }}</strong><p>{{ place.description }}</p><small>★ {{ Number(place.rating || 0).toFixed(1) }} · {{ place.category }}</small></div>
              <button @click="isCuratorOpen = false; searchQuery = place.name">보기</button>
            </article>
            <p v-if="!curatorRecommendations.length" class="curator-note">추천할 장소가 없습니다. 장소를 등록하거나 다른 도시를 선택해 주세요[span_2](start_span)[span_2](end_span).</p>
          </div>
        </section>
      </div>

      <div v-if="isSidebarOpen" class="overlay" @click.self="isSidebarOpen = false">
        <aside class="sidebar">
          <div class="panel-heading">
            <div><strong>🇰🇷 대한민국 17개 행정구역</strong><small>도시를 선택하여 명소를 확인하세요</small></div>
            <button @click="isSidebarOpen = false">×</button>
          </div>
          <div class="region-groups">
            <p>특별시 · 광역시 · 특별자치시</p>
            <button v-for="region in metroRegions" :key="region.id"
                    :class="{ chosen: selectedCityId === region.id }" @click="selectCity(region.id)">
              <span>{{ region.icon }} {{ region.name }}</span><small>{{ cityCounts[region.id] || 0 }}개</small>
            </button>
            <p>도 · 특별자치도</p>
            <button v-for="region in provinceRegions" :key="region.id"
                    :class="{ chosen: selectedCityId === region.id }" @click="selectCity(region.id)">
              <span>{{ region.icon }} {{ region.name }}</span><small>{{ cityCounts[region.id] || 0 }}개</small>
            </button>
          </div>
          <footer>Curator Pro v2.5 · iOS 19 Compatible</footer>
        </aside>
      </div>

      <div v-if="isRegisterOpen" class="overlay modal-overlay" @click.self="closeRegister">
        <section class="register-modal">
          <header class="modal-heading">
            <div><strong>{{ editingPlaceId !== null ? '✨ 명소 수정하기' : '✨ 시크릿 명소 추가하기' }}</strong><small>지도나 주소 검색으로 위치를 설정하세요</small></div>
            <button @click="closeRegister">×</button>
          </header>
          <div class="modal-content">
            <label>행정구역 도시 선택</label>
            <select v-model="newPlace.cityId">
              <option v-for="region in regions" :key="region.id" :value="region.id">{{ region.icon }} {{ region.name }} ({{ region.shortName }})</option>
            </select>

            <div class="form-grid">
              <div class="name-field"><label>명소 이름 *</label><input v-model="newPlace.name" placeholder="예: 성수동 가로수 카페"></div>
              <div><label>카테고리</label>
                <select v-model="newPlace.category">
                  <option>핫플레이스</option><option>오션뷰</option><option>인생샷</option>
                  <option>카페/디저트</option><option>맛집</option><option>힐링/산책</option><option>랜드마크</option>
                </select>
              </div>
            </div>

            <div class="location-heading">
              <label>위치 입력 방식 *</label>
              <div class="tabs">
                <button :class="{ active: registerTab === 'map' }" @click="registerTab = 'map'">⌖ 지도 핀 찍기</button>
                <button :class="{ active: registerTab === 'search' }" @click="registerTab = 'search'">⌕ 주소 검색</button>
              </div>
            </div>

            <div v-if="registerTab === 'map'" class="map-location-search">
              <input v-model.trim="mapLocationQuery" @keydown.enter.prevent="searchMapLocation" placeholder="지도에서 위치 검색 (예: 울산 동구)">
              <button :disabled="mapLocationLoading" @click="searchMapLocation">{{ mapLocationLoading ? '검색 중…' : '⌕ 찾기' }}</button>
            </div>
            <div v-if="registerTab === 'map'" class="map-picker-wrap">
              <div ref="realMap" class="real-map" aria-label="카카오 지도"></div>
              <div class="map-hint">지도를 이동·확대하고 원하는 위치를 터치해 핀을 선택하세요.</div>
            </div>
            <div v-else class="address-search">
              <input v-model.trim="addressSearchQuery" @input="searchAddresses" placeholder="도로명 주소 또는 건물명 입력">
              <p v-if="addressSearchLoading" class="address-status">주소 검색 중...</p>
              <div class="address-results">
                <button v-for="item in searchedAddresses" :key="item.place_id"
                        @click="selectSearchedAddress(item)">
                  <span><b>{{ item.name }}</b><small>{{ item.display_name }}</small></span>
                  <em>선택</em>
                </button>
                <p v-if="addressSearchQuery && !addressSearchLoading && searchedAddresses.length === 0">검색 결과가 없습니다.</p>
              </div>
            </div>
            <input class="selected-address" :value="newPlace.address" readonly placeholder="선택된 주소가 표시됩니다">

            <label>이 장소가 특별한 이유</label>
            <textarea v-model="newPlace.description" rows="2" placeholder="뷰가 멋진 창가 자리, 추천 메뉴 등 시크릿 팁을 남겨주세요[span_3](start_span)[span_3](end_span)."></textarea>
            <label>태그 (쉼표로 구분)</label>
            <input v-model="newPlace.tags" placeholder="오션뷰, 데이트, 분위기맛집">
            <label>이미지 주소 (선택)</label>
            <input v-model="newPlace.image" placeholder="https://...">
            <label>상세 위치 (선택)</label>
            <input v-model="newPlace.detailAddress" placeholder="예: 2층 창가 자리">
          </div>
          <footer class="modal-actions">
            <button class="cancel-button" @click="closeRegister">취소</button>
            <button class="save-button" @click="savePlace">✓ {{ editingPlaceId !== null ? '수정 내용 저장' : '장소 저장하기' }}</button>
          </footer>
        </section>
      </div>

      <div v-if="toastMessage" class="toast">✨ {{ toastMessage }}</div>
    </section>
  </div>
</template>

<script>
import { nextTick } from 'vue';

const KOREA_REGIONS = [
  { id: 'seoul', name: '서울특별시', shortName: '서울', icon: '🏛️', category: 'special' },
  { id: 'busan', name: '부산광역시', shortName: '부산', icon: '🌊', category: 'metro' },
  { id: 'daegu', name: '대구광역시', shortName: '대구', icon: '🍎', category: 'metro' },
  { id: 'incheon', name: '인천광역시', shortName: '인천', icon: '✈️', category: 'metro' },
  { id: 'gwangju', name: '광주광역시', shortName: '광주', icon: '🎨', category: 'metro' },
  { id: 'daejeon', name: '대전광역시', shortName: '대전', icon: '🔬', category: 'metro' },
  { id: 'ulsan', name: '울산광역시', shortName: '울산', icon: '🐳', category: 'metro' },
  { id: 'sejong', name: '세종특별자치시', shortName: '세종', icon: '🏢', category: 'special' },
  { id: 'gyeonggi', name: '경기도', shortName: '경기', icon: '🌲', category: 'province' },
  { id: 'gangwon', name: '강원특별자치도', shortName: '강원', icon: '🏔️', category: 'province' },
  { id: 'chungbuk', name: '충청북도', shortName: '충북', icon: '⛰️', category: 'province' },
  { id: 'chungnam', name: '충청남도', shortName: '충남', icon: '🌾', category: 'province' },
  { id: 'jeonbuk', name: '전북특별자치도', shortName: '전북', icon: '🍲', category: 'province' },
  { id: 'jeonnam', name: '전라남도', shortName: '전남', icon: '🏝️', category: 'province' },
  { id: 'gyeongbuk', name: '경상북도', shortName: '경북', icon: '⛩️', category: 'province' },
  { id: 'gyeongnam', name: '경상남도', shortName: '경남', icon: '🌸', category: 'province' },
  { id: 'jeju', name: '제주특별자치도', shortName: '제주', icon: '🍊', category: 'province' }
];

const INITIAL_PLACES = [
  { id: 1, cityId: 'seoul', name: '더 현대 서울', category: '핫플레이스', rating: 4.8, address: '서울 영등포구 여의대로 108', detailAddress: '지하 2층 팝업스토어 존', description: '도심 속 자연을 품은 혁신적인 실내 정원 사운즈 포레스트와 트렌디한 글로벌 팝업스토어 성지[span_4](start_span)[span_4](end_span).', image: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80', likes: 1240, tags: ['쇼핑', '실내정원', '팝업스토어'] },
  { id: 2, cityId: 'seoul', name: 'N서울타워', category: '랜드마크', rating: 4.7, address: '서울 용산구 남산공원길 105', detailAddress: '전망대 타워층', description: '서울 시내를 360도 파노라마로 한눈에 감상할 수 있는 로맨틱한 대표 밤야경 힐링 스팟[span_5](start_span)[span_5](end_span).', image: 'https://images.unsplash.com/photo-1538485199708-0f51451c5301?auto=format&fit=crop&w=800&q=80', likes: 980, tags: ['야경', '남산', '데이스코스'] },
  { id: 3, cityId: 'busan', name: '광안리 해수욕장 & M드론라이트쇼', category: '오션뷰', rating: 4.9, address: '부산 수영구 광안해변로 219', detailAddress: '민락타운 앞 해변무대', description: '화려한 광안대교 조명과 수천 대의 드론이 펼치는 밤하늘의 낭만적인 드론 쇼[span_6](start_span)[span_6](end_span).', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', likes: 2150, tags: ['바다', '드론쇼', '광안대교'] },
  { id: 4, cityId: 'jeju', name: '사계해안 지층대', category: '인생샷', rating: 4.9, address: '제주특별자치도 서귀포시 안덕면 사계리', detailAddress: '사계항 해안도로변', description: '독특한 화산지형 지층 무늬와 구멍 뚫린 해안 바위가 어우러져 해외 여행지 같은 포토존[span_7](start_span)[span_7](end_span).', image: 'https://images.unsplash.com/photo-1540206395-68808572332f?auto=format&fit=crop&w=800&q=80', likes: 1840, tags: ['포토존', '자연경관', '제주서부'] },
  { id: 5, cityId: 'gyeongbuk', name: '경주 동궁과 월지', category: '역사/야경', rating: 4.85, address: '경상북도 경주시 원화로 102', detailAddress: '동궁과 월지 연못 둘레길', description: '신라 왕궁의 별궁 터로 밤이 되면 연못에 반사되는 조명 건물들이 몽환적인 야경 명소[span_8](start_span)[span_8](end_span).', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', likes: 890, tags: ['경주야경', '신라유적', '산책'] },
  { id: 6, cityId: 'gangwon', name: '강릉 안목해변 커피거리', category: '카페/바다', rating: 4.6, address: '강원특별자치도 강릉시 창해로 14', detailAddress: '카페거리 중앙 광장', description: '동해 바다 풍경을 바라보며 명품 스페셜티 커피와 디저트를 즐길 수 있는 카페 거리[span_9](start_span)[span_9](end_span).', image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80', likes: 1420, tags: ['커피', '동해바다', '드라이브'] }
];

const CURATED_PLACES = [
  { id: 101, cityId: 'seoul', name: '경복궁', category: '명소', rating: 4.6, address: '서울특별시 경복궁', detailAddress: '', description: '경복궁 지역에서 방문하기 좋은 대표 명소입니다[span_10](start_span)[span_10](end_span). 방문 전 운영 시간과 이용 정보를 확인하세요[span_11](start_span)[span_11](end_span).', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 102, cityId: 'seoul', name: '창덕궁과 후원', category: '명소', rating: 4.6, address: '서울특별시 창덕궁과 후원', detailAddress: '', description: '창덕궁과 후원 지역에서 방문하기 좋은 대표 명소입니다[span_12](start_span)[span_12](end_span). 방문 전 운영 시간과 이용 정보를 확인하세요[span_13](start_span)[span_13](end_span).', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] }
];

const EMPTY_PLACE = () => ({
  cityId: 'seoul', name: '', category: '핫플레이스', address: '',
  detailAddress: '', description: '', tags: '', image: '',
  coordinates: { lat: null, lng: null }
});

export default {
  name: 'App',
  data() {
    return {
      regions: KOREA_REGIONS,
      places: [...INITIAL_PLACES, ...CURATED_PLACES].map(place => ({ ...place })),
      selectedCityId: 'all',
      searchInput: '',
      searchQuery: '',
      livePlaces: [],
      liveSearchLoading: false,
      liveSearchMessage: '',
      kakaoAppKey: '',
      kakaoAppKeyInput: '',
      showApiKeyInput: false,
      likedPlaceIds: [1, 3],
      isSidebarOpen: false,
      activeTab: 'explore',
      isCuratorOpen: false,
      curatorMood: '전체 추천',
      curatorRegionId: 'seoul',
      curatorMoods: ['전체 추천', '맛집', '카페/디저트', '힐링/산책', '인생샷'],
      isRegisterOpen: false,
      editingPlaceId: null,
      registerTab: 'map',
      newPlace: EMPTY_PLACE(),
      addressSearchQuery: '',
      searchedAddresses: [],
      addressSearchLoading: false,
      mapInstance: null,
      mapMarker: null,
      mapLocationQuery: '',
      mapLocationLoading: false,
      placesDb: null,
      addressSearchTimer: null,
      toastMessage: '',
      toastTimer: null
    };
  },
  computed: {
    currentRegion() {
      return this.regions.find(region => region.id === this.selectedCityId) || { id: 'all', name: '전체 지역', shortName: '전국', icon: '🇰🇷' };
    },
    filteredPlaces() {
      const query = this.searchQuery.toLocaleLowerCase('ko-KR').trim();
      return this.places.filter(place => {
        if (this.selectedCityId !== 'all' && String(place.cityId) !== String(this.selectedCityId)) return false;
        if (!query) return true;
        return [place.name, place.description, place.category, place.address, ...(place.tags || [])]
          .some(value => String(value || '').toLocaleLowerCase('ko-KR').includes(query));
      });
    },
    visiblePlaces() {
      const source = this.livePlaces.length ? this.livePlaces : this.filteredPlaces;
      const list = this.activeTab === 'saved' ? source.filter(place => this.likedPlaceIds.includes(place.id)) : source;
      return list;
    },
    curatorRecommendations() {
      const mood = this.curatorMood;
      return this.places.filter(place => (this.curatorRegionId === 'all' || String(place.cityId) === String(this.curatorRegionId)) && (mood === '전체 추천' || place.category.includes(mood) || (place.tags || []).some(tag => tag.includes(mood))))
        .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 5);
    },
    cityCounts() {
      const counts = Object.fromEntries(this.regions.map(region => [region.id, 0]));
      this.places.forEach(place => { if (counts[place.cityId] !== undefined) counts[place.cityId] += 1; });
      return counts;
    },
    metroRegions() {
      return this.regions.filter(region => region.category !== 'province');
    },
    provinceRegions() {
      return this.regions.filter(region => region.category === 'province');
    },
  },
  async mounted() {
    try { this.kakaoAppKey = localStorage.getItem('curator_kakao_js_key') || ''; } catch (_) { this.kakaoAppKey = ''; }
    this.kakaoAppKeyInput = this.kakaoAppKey;
    await this.initializePlacesDb();
  },
  methods: {
    async initializePlacesDb() {
      if (!('indexedDB' in window)) { this.showToast('이 브라우저는 IndexedDB를 지원하지 않습니다.'); return; }
      try {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('CuratorPlacesDB', 2);
          request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains('places')) database.createObjectStore('places', { keyPath: 'id' });
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        db.onversionchange = () => db.close();
        this.placesDb = db;
        const storedPlaces = await new Promise((resolve, reject) => {
          const request = db.transaction('places', 'readonly').objectStore('places').getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
        if (storedPlaces.length) this.places = storedPlaces;
        else await this.persistAllPlaces();
      } catch (error) { this.showToast('IndexedDB를 열지 못했습니다[span_14](start_span)[span_14](end_span). 브라우저 저장 설정을 확인해주세요.'); }
    },
    async persistAllPlaces() {
      if (!this.placesDb) throw new Error('IndexedDB가 초기화되지 않았습니다[span_15](start_span)[span_15](end_span).');
      const records = JSON.parse(JSON.stringify(this.places)).map(place => ({
        ...place,
        id: place.id,
        coordinates: place.coordinates && Number.isFinite(Number(place.coordinates.lat)) && Number.isFinite(Number(place.coordinates.lng))
          ? { lat: Number(place.coordinates.lat), lng: Number(place.coordinates.lng) }
          : { lat: null, lng: null },
        address: String(place.address || ''),
        name: String(place.name || ''),
        tags: Array.isArray(place.tags) ? place.tags.map(String) : []
      }));
      await new Promise((resolve, reject) => {
        let transaction;
        try {
          transaction = this.placesDb.transaction(['places'], 'readwrite');
          const store = transaction.objectStore('places');
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction error'));
          transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
          store.clear();
          records.forEach(record => store.put(record));
        } catch (error) {
          reject(error);
        }
      });
    },
    saveKakaoKey() {
      const key = this.kakaoAppKeyInput.trim();
      if (!key) { this.showToast('카카오 JavaScript 키를 입력해주세요.'); return; }
      this.kakaoAppKey = key;
      try { localStorage.setItem('curator_kakao_js_key', key); } catch (_) { this.showToast('브라우저 저장소를 사용할 수 없어 이번 세션에만 적용됩니다.'); }
      this.showApiKeyInput = false;
      this.showToast('실시간 검색 키를 저장했습니다.');
    },
    async loadKakaoPlacesSdk() {
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
        return new Promise((resolve) => {
          window.kakao.maps.load(() => resolve(window.kakao));
        });
      }
      throw new Error('KAKAO_SDK_LOAD_FAILED');
    },
    async runSearch() {
      const query = this.searchInput.trim();
      this.searchQuery = query;
      this.activeTab = 'explore';
      this.livePlaces = [];
      this.liveSearchMessage = '';
      if (!query) { this.showToast('검색어를 입력해주세요.'); return; }
      
      this.liveSearchLoading = true;
      try {
        const kakao = await this.loadKakaoPlacesSdk();
        const places = new kakao.maps.services.Places();
        const regionName = this.selectedCityId === 'all' ? '' : (this.regions.find(r => r.id === this.selectedCityId)?.name || '');
        const keyword = `${regionName} ${query}`.trim();
        const result = await new Promise((resolve, reject) => {
          places.keywordSearch(keyword, (data, status) => {
            if (status === kakao.maps.services.Status.OK) resolve(data || []);
            else if (status === kakao.maps.services.Status.ZERO_RESULT) resolve([]);
            else reject(new Error(`KAKAO_SEARCH_${status}`));
          }, { size: 15 });
        });
        this.livePlaces = result.map((item, index) => {
          const matchedRegion = this.selectedCityId !== 'all'
            ? this.selectedCityId
            : (this.regions.find(region => item.address_name?.includes(region.shortName) || item.road_address_name?.includes(region.shortName))?.id || 'seoul');
          return {
            id: `kakao-${item.id || index}`,
            cityId: matchedRegion,
            name: item.place_name || '이름 없는 장소',
            category: (item.category_name || '').split(' > ').slice(-1)[0] || '장소',
            rating: 0,
            address: item.road_address_name || item.address_name || '',
            detailAddress: '',
            description: item.category_name || '카카오 로컬에서 실시간으로 검색한 장소입니다[span_16](start_span)[span_16](end_span).',
            image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
            likes: 0,
            tags: [item.category_group_name || '실시간 검색', '카카오 로컬'],
            coordinates: { lat: Number(item.y), lng: Number(item.x) },
            kakaoUrl: item.place_url
          };
        });
        this.liveSearchMessage = this.livePlaces.length ? `실시간 검색 결과 ${this.livePlaces.length}곳` : '검색 결과가 없습니다. 다른 검색어를 입력해보세요.';
      } catch (error) {
        this.liveSearchMessage = '실시간 검색에 실패했습니다. 키 설정과 인터넷 연결을 확인하세요[span_17](start_span)[span_17](end_span).';
      } finally { this.liveSearchLoading = false; }
    },
    openCurator() {
      this.curatorMood = '전체 추천';
      this.curatorRegionId = this.selectedCityId === 'all' ? 'seoul' : this.selectedCityId;
      this.isCuratorOpen = true;
    },
    clearSearch() { this.searchInput = ''; this.searchQuery = ''; this.livePlaces = []; this.liveSearchMessage = ''; },
    selectCity(cityId) {
      this.selectedCityId = cityId;
      this.isSidebarOpen = false;
    },
    openRegister() {
      this.editingPlaceId = null;
      this.newPlace = { ...EMPTY_PLACE(), cityId: this.selectedCityId === 'all' ? this.regions[0].id : this.selectedCityId };
      this.registerTab = 'map';
      this.addressSearchQuery = '';
      this.searchedAddresses = [];
      this.isRegisterOpen = true;
      nextTick(() => this.initializeMap());
    },
    editPlace(place) {
      this.editingPlaceId = place.id;
      this.newPlace = {
        cityId: place.cityId || this.regions[0].id,
        name: place.name || '',
        category: place.category || '핫플레이스',
        address: place.address || '',
        detailAddress: place.detailAddress || '',
        description: place.description || '',
        tags: Array.isArray(place.tags) ? place.tags.join(', ') : (place.tags || ''),
        image: place.image || '',
        coordinates: place.coordinates ? { ...place.coordinates } : { lat: null, lng: null }
      };
      this.registerTab = 'map';
      this.addressSearchQuery = '';
      this.mapLocationQuery = '';
      this.searchedAddresses = [];
      this.isRegisterOpen = true;
      nextTick(() => this.initializeMap());
    },
    async deletePlace(place) {
      if (!window.confirm(`“${place.name}” 장소를 삭제할까요?`)) return;
      const previous = this.places;
      this.places = this.places.filter(item => item.id !== place.id);
      try {
        await this.persistAllPlaces();
        this.showToast('장소를 삭제했습니다.');
      } catch (error) {
        this.places = previous;
        this.showToast('삭제 저장에 실패했습니다. 다시 시도해주세요.');
      }
    },
    closeRegister() {
      this.isRegisterOpen = false;
      this.destroyMap();
    },
    showToast(message) {
      this.toastMessage = message;
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => { this.toastMessage = ''; }, 2600);
    },
    toggleLike(id) {
      const index = this.likedPlaceIds.indexOf(id);
      if (index >= 0) {
        this.likedPlaceIds.splice(index, 1);
        this.showToast('보관함에서 제거되었습니다.');
      } else {
        this.likedPlaceIds.push(id);
        this.showToast('나만의 저장소에 담았습니다! ❤️');
      }
    },
    openNavigation(place) {
      const name = String(place.name || '').trim();
      const address = String(place.address || '').trim();
      const destination = [name, address].filter(Boolean).join(' ')
        || (Number.isFinite(Number(place.coordinates?.lat)) && Number.isFinite(Number(place.coordinates?.lng))
          ? `${place.coordinates.lat},${place.coordinates.lng}` : '');
      if (!destination) {
        this.showToast('장소 이름이나 주소를 먼저 등록해주세요.');
        return;
      }
      const naverUrl = `https://map.naver.com/p/search/${encodeURIComponent(destination)}`;
      const opened = window.open(naverUrl, '_blank');
      if (!opened) window.location.href = naverUrl;
      this.showToast(`${name || address} 네이버 지도에서 검색합니다.`);
    },

    async initializeMap() {
      if (!this.$refs.realMap) return;
      try {
        const kakao = await this.loadKakaoPlacesSdk();
        if (!this.$refs.realMap) return;

        const centers = { 
          seoul:[37.5665,126.9780], busan:[35.1796,129.0756], daegu:[35.8714,128.6014], 
          incheon:[37.4563,126.7052], gwangju:[35.1595,126.8526], daejeon:[36.3504,127.3845], 
          ulsan:[35.5384,129.3114], sejong:[36.4800,127.2890], gyeonggi:[37.4138,127.5183], 
          gangwon:[37.8228,128.1555], chungbuk:[36.6357,127.4914], chungnam:[36.6588,126.6728], 
          jeonbuk:[35.7175,127.1530], jeonnam:[34.8679,126.9910], gyeongbuk:[36.4919,128.8889], 
          gyeongnam:[35.4606,128.2132], jeju:[33.4996,126.5312] 
        };

        const currentCoords = this.newPlace.coordinates?.lat && this.newPlace.coordinates?.lng
          ? { lat: Number(this.newPlace.coordinates.lat), lng: Number(this.newPlace.coordinates.lng) }
          : (centers[this.newPlace.cityId] || centers.seoul);

        const options = {
          center: new kakao.maps.LatLng(currentCoords.lat, currentCoords.lng),
          level: 3
        };

        this.mapInstance = new kakao.maps.Map(this.$refs.realMap, options);

        const markerPosition = new kakao.maps.LatLng(currentCoords.lat, currentCoords.lng);
        this.mapMarker = new kakao.maps.Marker({ position: markerPosition });
        this.mapMarker.setMap(this.mapInstance);

        kakao.maps.event.addListener(this.mapInstance, 'click', (mouseEvent) => {
          const latlng = mouseEvent.latLng;
          const lat = latlng.getLat();
          const lng = latlng.getLng();

          this.newPlace.coordinates = { lat, lng };
          this.mapMarker.setPosition(latlng);

          const geocoder = new kakao.maps.services.Geocoder();
          geocoder.coord2Address(lng, lat, (result, status) => {
            if (status === kakao.maps.services.Status.OK) {
              const item = result[0];
              const addressName = item.road_address ? item.road_address.address_name : item.address.address_name;
              this.newPlace.address = addressName;
              if (!this.newPlace.name.trim() || this.newPlace.name === '새 장소' || this.newPlace.name === '지도에서 선택한 장소') {
                this.newPlace.name = item.road_address?.building_name || addressName.split(' ').slice(-1)[0] || '선택한 장소';
              }
            } else {
              this.newPlace.address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
          });
          this.showToast('위치가 선택되었습니다.');
        });

        setTimeout(() => {
          if (this.mapInstance) this.mapInstance.relayout();
        }, 150);
      } catch (error) {
        this.showToast('카카오 지도를 불러오지 못했습니다. API 키를 확인해주세요.');
      }
    },
    async searchMapLocation() {
      const query = this.mapLocationQuery.trim();
      if (!query) { this.showToast('검색할 지역이나 장소를 입력해주세요.'); return; }
      this.mapLocationLoading = true;
      try {
        const kakao = await this.loadKakaoPlacesSdk();
        const geocoder = new kakao.maps.services.Geocoder();

        geocoder.addressSearch(query, (result, status) => {
          if (status === kakao.maps.services.Status.OK && result.length > 0) {
            this.mapLocationLoading = false;
            const lat = Number(result[0].y);
            const lng = Number(result[0].x);
            this.newPlace.coordinates = { lat, lng };
            this.newPlace.address = result[0].address_name;
            this.setMapMarker(lat, lng);
            this.showToast(`${result[0].address_name} 위치로 이동했습니다.`);
          } else {
            const ps = new kakao.maps.services.Places();
            ps.keywordSearch(query, (data, pStatus) => {
              this.mapLocationLoading = false;
              if (pStatus === kakao.maps.services.Status.OK && data.length > 0) {
                const lat = Number(data[0].y);
                const lng = Number(data[0].x);
                this.newPlace.coordinates = { lat, lng };
                this.newPlace.address = data[0].road_address_name || data[0].address_name;
                this.newPlace.name = data[0].place_name;
                this.setMapMarker(lat, lng);
                this.showToast(`${data[0].place_name} 위치로 이동했습니다.`);
              } else {
                this.showToast('검색 결과가 없습니다. 정확한 명칭을 입력해주세요.');
              }
            });
          }
        });
      } catch (error) {
        this.mapLocationLoading = false;
        this.showToast('위치 검색 중 오류가 발생했습니다.');
      }
    },
    setMapMarker(lat, lng) {
      if (!this.mapInstance || !window.kakao) return;
      const coords = new window.kakao.maps.LatLng(Number(lat), Number(lng));
      this.mapInstance.setCenter(coords);
      if (this.mapMarker) {
        this.mapMarker.setPosition(coords);
      } else {
        this.mapMarker = new window.kakao.maps.Marker({ position: coords });
        this.mapMarker.setMap(this.mapInstance);
      }
    },
    destroyMap() {
      this.mapInstance = null;
      this.mapMarker = null;
    },
    searchAddresses() {
      clearTimeout(this.addressSearchTimer);
      const query = this.addressSearchQuery.trim();
      this.searchedAddresses = [];
      if (query.length < 2) return;
      this.addressSearchTimer = setTimeout(async () => {
        this.addressSearchLoading = true;
        try {
          const kakao = await this.loadKakaoPlacesSdk();
          const geocoder = new kakao.maps.services.Geocoder();
          geocoder.addressSearch(query, (result, status) => {
            this.addressSearchLoading = false;
            if (status === kakao.maps.services.Status.OK) {
              this.searchedAddresses = result.map((item, index) => ({
                place_id: index,
                display_name: item.address_name,
                lat: item.y,
                lon: item.x,
                name: item.road_address?.building_name || item.address_name
              }));
            } else {
              const ps = new kakao.maps.services.Places();
              ps.keywordSearch(query, (data, pStatus) => {
                if (pStatus === kakao.maps.services.Status.OK) {
                  this.searchedAddresses = data.map((item, index) => ({
                    place_id: index,
                    display_name: item.road_address_name || item.address_name,
                    lat: item.y,
                    lon: item.x,
                    name: item.place_name
                  }));
                } else {
                  this.searchedAddresses = [];
                }
              });
            }
          });
        } catch (_) {
          this.addressSearchLoading = false;
          this.showToast('주소 검색에 실패했습니다[span_18](start_span)[span_18](end_span).');
        }
      }, 550);
    },
    selectSearchedAddress(item) {
      const lat = Number(item.lat), lng = Number(item.lon);
      this.newPlace.address = item.display_name;
      this.newPlace.coordinates = { lat, lng };
      if (!this.newPlace.name.trim()) this.newPlace.name = item.name || item.display_name.split(',')[0].trim();
      this.searchedAddresses = [];
      this.registerTab = 'map';
      nextTick(() => this.initializeMap().then(() => this.setMapMarker(lat, lng)));
      this.showToast('검색한 주소를 지도에 표시했습니다.');
    },
    async savePlace() {
      if (!this.newPlace.name.trim()) {
        this.showToast('⚠️ 명소 이름을 입력해주세요.');
        return;
      }
      if (!this.newPlace.address.trim()) {
        this.showToast('⚠️ 지도 핀 또는 주소 검색으로 위치를 선택해주세요.');
        return;
      }
      const tags = this.newPlace.tags
        ? this.newPlace.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : ['추천핫플', 'NEW'];
      const existingPlace = this.editingPlaceId !== null ? this.places.find(item => item.id === this.editingPlaceId) : null;
      const place = {
        ...(existingPlace || {}),
        id: existingPlace ? existingPlace.id : Date.now(),
        cityId: this.newPlace.cityId,
        name: this.newPlace.name.trim(),
        category: this.newPlace.category || '핫플레이스',
        rating: 5,
        address: this.newPlace.address,
        detailAddress: this.newPlace.detailAddress || '상세위치 정보',
        description: this.newPlace.description || '방문객들이 강력 추천하는 새로운 핫플레이스입니다.',
        image: this.newPlace.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
        likes: existingPlace ? (existingPlace.likes || 0) : 1,
        coordinates: { ...this.newPlace.coordinates },
        tags
      };
      if (existingPlace) {
        this.places = this.places.map(item => item.id === place.id ? place : item);
      } else {
        this.places.unshift(place);
      }
      try {
        await this.persistAllPlaces();
      } catch (error) {
        if (existingPlace) this.places = this.places.map(item => item.id === existingPlace.id ? existingPlace : item);
        else this.places = this.places.filter(item => item.id !== place.id);
        console.error('IndexedDB 저장 실패:', error);
        const reason = error && (error.name || error.message) ? `${error.name || 'Error'}: ${error.message || ''}` : '';
        this.showToast(`IndexedDB 저장 실패${reason ? ` (${reason})` : ''}. 브라우저 저장 설정을 확인해주세요.`);
        return;
      }
      this.selectedCityId = place.cityId;
      this.searchQuery = '';
      this.searchInput = '';
      this.isRegisterOpen = false;
      this.newPlace = EMPTY_PLACE();
      this.editingPlaceId = null;
      this.showToast(existingPlace ? '장소 정보를 수정했습니다.' : '✨ 나만의 시크릿 플레이스가 등록되었습니다!');
    },
    resetExplore() {
      this.activeTab = 'explore';
      this.searchQuery = '';
      this.searchInput = '';
    },
    showSaved() {
      this.activeTab = 'saved';
      this.searchQuery = '';
      this.searchInput = '';
      if (!this.likedPlaceIds.length) this.showToast('아직 보관한 장소가 없습니다. ♥ 버튼으로 저장해보세요.');
    },
    onImageError(event) {
      event.target.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';
    }
  },
  beforeUnmount() {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    clearTimeout(this.addressSearchTimer);
    this.destroyMap();
  }
};
</script>

<style scoped>
:global(*) { box-sizing: border-box; }
.curator-app {
  min-height: 100vh; padding: 18px; display: flex; flex-direction: column; align-items: center;
  background: #020617; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Pretendard", sans-serif;
  overflow: hidden; position: relative;
}
.ambient { position: fixed; width: 360px; height: 360px; border-radius: 50%; filter: blur(110px); opacity: .16; pointer-events: none; }
.ambient-one { background: #6366f1; top: -130px; left: -100px; }
.ambient-two { background: #9333ea; right: -120px; bottom: -130px; }
.device-frame { width: 100%; max-width: 1050px; height: 100dvh; min-height: 560px; position: relative; display: flex; flex-direction: column; overflow: hidden; background: #0f172a; border: 1px solid #334155; border-radius: 30px; box-shadow: 0 25px 80px #0009; isolation: isolate; }

.glow { position: absolute; z-index: -1; border-radius: 50%; filter: blur(85px); pointer-events: none; }
.glow-a { width: 270px; height: 270px; background: #4f46e5; opacity: .18; top: -100px; left: -100px; }
.glow-b { width: 300px; height: 300px; background: #9333ea; opacity: .16; bottom: -100px; right: -100px; }
.header-actions { display:flex; align-items:center; gap:8px; }
.ai-button { border:1px solid #818cf855; border-radius:13px; padding:10px 12px; background:linear-gradient(110deg,#4f46e5,#9333ea); color:white; font-size:11px; font-weight:800; cursor:pointer; white-space:nowrap; }
.app-header { padding: 13px 18px 12px; display: flex; justify-content: space-between; align-items: center; z-index: 2; }
.header-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.icon-button, .add-button { width: 39px; height: 39px; flex: 0 0 auto; border: 1px solid #334155; border-radius: 14px; background: #1e293bcc; color: #e2e8f0; font-size: 19px; cursor: pointer; }
.add-button { border: 1px solid #818cf855; background: linear-gradient(135deg, #4f46e5, #9333ea); color: white; font-size: 25px; box-shadow: 0 6px 20px #4f46e544; }
.region-title { display: flex; align-items: center; gap: 7px; }
.region-title h1 { margin: 0; font-size: 16px; font-weight: 900; letter-spacing: -.5px; }
.region-title span { font-size: 16px; }
.header-left p { margin: 3px 0 0; color: #94a3b8; font-size: 10px; }
.region-strip { display: flex; gap: 7px; overflow-x: auto; padding: 3px 17px 11px; scrollbar-width: none; z-index: 2; }
.region-strip::-webkit-scrollbar { display: none; }
.region-strip button { flex: 0 0 auto; display: flex; align-items: center; gap: 5px; border: 1px solid #33415599; border-radius: 13px; padding: 7px 9px; color: #cbd5e1; background: #1e293b99; font-size: 10px; cursor: pointer; }
.region-strip button.selected { color: white; border-color: #818cf866; background: linear-gradient(110deg, #4f46e5, #7c3aed); box-shadow: 0 5px 15px #4f46e533; }
.region-strip button small { padding: 2px 5px; border-radius: 9px; background: #ffffff20; font-size: 9px; }
.search-area { margin: 0 17px 13px; padding: 0 12px; display: flex; align-items: center; gap: 9px; border: 1px solid #334155; border-radius: 15px; background: #1e293bcc; z-index: 2; }
.search-area input { flex: 1; min-width: 0; padding: 12px 0; border: 0; outline: 0; background: transparent; color: #f8fafc; font-size: 11px; }
.search-area input::placeholder { color: #64748b; }
.search-area button { border: 0; background: transparent; color: #94a3b8; font-size: 20px; }
.place-feed { flex: 1; min-height: 0; overflow-y: auto; padding: 0 17px 95px; z-index: 1; scrollbar-width: thin; scrollbar-color: #334155 transparent; }
.place-card { overflow: hidden; margin-bottom: 14px; border: 1px solid #334155aa; border-radius: 23px; background: #1e293b88; box-shadow: 0 12px 28px #0003; }
.place-image { position: relative; height: 185px; overflow: hidden; background: #020617; }
.place-image img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s; }
.place-card:hover .place-image img { transform: scale(1.04); }
.image-shade { position: absolute; inset: 0; background: linear-gradient(to top, #020617dd, transparent 65%); }
.category-label { position: absolute; top: 12px; left: 12px; padding: 5px 9px; border: 1px solid #ffffff22; border-radius: 20px; background: #0f172acc; color: #c7d2fe; font-size: 9px; font-weight: 800; }
.like-button { position: absolute; top: 10px; right: 10px; width: 34px; height: 34px; border: 1px solid #ffffff22; border-radius: 12px; background: #0f172aaa; color: #e2e8f0; font-size: 20px; cursor: pointer; }
.like-button.liked { background: #f43f5e; color: white; border-color: #fb7185; }
.rating { position: absolute; bottom: 11px; left: 12px; padding: 4px 7px; border: 1px solid #ffffff20; border-radius: 8px; background: #0f172acc; color: #fbbf24; font-size: 10px; font-weight: 800; }
.place-info { padding: 13px 14px 14px; }
.place-info h2 { margin: 0 0 7px; color: #f8fafc; font-size: 14px; font-weight: 850; }
.description { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 0; color: #cbd5e1; font-size: 10px; line-height: 1.65; }
.tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
.tags span { padding: 3px 6px; border: 1px solid #47556977; border-radius: 6px; background: #33415588; color: #cbd5e1; font-size: 9px; }
.place-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 11px; padding-top: 10px; border-top: 1px solid #334155aa; }
.address { display: flex; align-items: center; gap: 5px; min-width: 0; color: #818cf8; font-size: 11px; }
.address span { overflow: hidden; color: #94a3b8; text-overflow: ellipsis; white-space: nowrap; }
.place-actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.edit-place-button, .delete-place-button { flex: 0 0 auto; border: 0; border-radius: 9px; padding: 7px 9px; color: #e2e8f0; background: #334155; font-size: 10px; font-weight: 800; cursor: pointer; }
.delete-place-button { background: #7f1d1d; }
.navigation-button { flex: 0 0 auto; border: 0; border-radius: 10px; padding: 7px 10px; background: #10b981; color: white; font-size: 10px; font-weight: 800; cursor: pointer; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 65px 15px; text-align: center; }
.empty-state > div { display: grid; place-items: center; width: 70px; height: 70px; margin-bottom: 16px; border: 1px solid #334155; border-radius: 22px; background: #1e293b; color: #818cf8; font-size: 38px; }
.empty-state h3 { margin: 0; font-size: 14px; }
.empty-state p { max-width: 260px; color: #94a3b8; font-size: 10px; line-height: 1.7; }
.primary-button, .save-button { border: 0; border-radius: 13px; padding: 11px 16px; background: linear-gradient(110deg, #4f46e5, #9333ea); color: white; font-size: 11px; font-weight: 800; cursor: pointer; }
.bottom-nav { position: absolute; bottom: 12px; left: 5%; width: 90%; display: flex; justify-content: space-around; padding: 10px 8px 8px; border: 1px solid #ffffff1c; border-radius: 22px; background: #0f172ae8; backdrop-filter: blur(20px); box-shadow: 0 10px 30px #0008; z-index: 4; }
.bottom-nav button { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; border: 0; background: transparent; color: #94a3b8; font-size: 19px; cursor: pointer; }
.bottom-nav button small { font-size: 9px; font-weight: 700; }
.bottom-nav button.nav-active { color: #a5b4fc; }
.feed-heading { display:flex; justify-content:space-between; align-items:center; padding:8px 2px 14px; color:#c7d2fe; font-size:13px; }
.feed-heading button { border:1px solid #475569; border-radius:9px; padding:6px 9px; background:#1e293b; color:#cbd5e1; font-size:10px; }
.curator-modal { display:flex; flex-direction:column; width:min(520px,100%); max-height:88%; overflow:hidden; border:1px solid #475569; border-radius:24px; background:#0f172a; }
.curator-region-label { display:block; color:#94a3b8; font-size:11px; font-weight:800; margin-bottom:6px; }
.curator-region-select { width:100%; margin-bottom:12px; padding:10px; border:1px solid #334155; border-radius:12px; background:#1e293b; color:#f8fafc; }
.curator-content { overflow:auto; padding:16px; }
.curator-note { color:#94a3b8; font-size:11px; line-height:1.6; }
.curator-controls { display:flex; flex-wrap:wrap; gap:7px; margin:12px 0; }
.curator-controls button { border:1px solid #334155; border-radius:18px; padding:7px 11px; background:#1e293b; color:#cbd5e1; font-size:10px; }
.curator-controls button.active { background:#4f46e5; color:white; }
.curator-result { display:flex; align-items:center; gap:10px; padding:10px 0; border-top:1px solid #334155; }
.curator-result img { width:64px; height:64px; object-fit:cover; border-radius:12px; }
.curator-result div { flex:1; min-width:0; }
.curator-result strong { font-size:12px; }
.curator-result p { margin:4px 0; color:#94a3b8; font-size:10px; }
.curator-result small { color:#fbbf24; font-size:9px; }
.curator-result button { border:0; border-radius:9px; padding:7px 9px; background:#4f46e5; color:white; font-size:10px; }
.bottom-nav em { position: absolute; top: -4px; right: -9px; display: grid; place-items: center; width: 14px; height: 14px; border-radius: 50%; background: #f43f5e; color: white; font-size: 8px; font-style: normal; }
.overlay { position: absolute; inset: 0; z-index: 10; display: flex; background: #020617c9; backdrop-filter: blur(8px); }
.sidebar { position: relative; display: flex; flex-direction: column; width: min(300px, 84%); height: 100%; border-right: 1px solid #334155; background: #0f172a; box-shadow: 20px 0 50px #0007; }
.panel-heading, .modal-heading { display: flex; align-items: center; justify-content: space-between; padding: 17px; border-bottom: 1px solid #334155; }
.panel-heading div, .modal-heading div { display: flex; flex-direction: column; gap: 5px; }
.panel-heading strong, .modal-heading strong { font-size: 12px; }
.panel-heading small, .modal-heading small { color: #94a3b8; font-size: 9px; }
.panel-heading button, .modal-heading button { width: 30px; height: 30px; border: 0; border-radius: 10px; background: #1e293b; color: #cbd5e1; font-size: 21px; cursor: pointer; }
.region-groups { flex: 1; overflow-y: auto; padding: 12px; }
.region-groups p { margin: 9px 7px; color: #64748b; font-size: 9px; font-weight: 800; letter-spacing: .5px; }
.region-groups button { display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 4px; padding: 10px; border: 0; border-radius: 12px; background: transparent; color: #cbd5e1; font-size: 10px; text-align: left; cursor: pointer; }
.region-groups button.chosen { background: linear-gradient(110deg, #4f46e5, #7c3aed); color: white; }
.region-groups button small { padding: 3px 6px; border-radius: 10px; background: #ffffff18; }
.sidebar footer { padding: 13px; border-top: 1px solid #334155; color: #64748b; text-align: center; font-size: 9px; }
.modal-overlay { align-items: center; justify-content: center; padding: 14px; }
.register-modal { display: flex; flex-direction: column; width: min(510px, 100%); max-height: 92%; overflow: hidden; border: 1px solid #475569; border-radius: 26px; background: #0f172a; box-shadow: 0 25px 80px #000a; }
.modal-content { overflow-y: auto; padding: 16px; }
.modal-content label, .location-heading label { display: block; margin: 12px 0 6px; color: #94a3b8; font-size: 10px; font-weight: 800; }
.modal-content input, .modal-content select, .modal-content textarea { width: 100%; min-width: 0; padding: 10px 11px; border: 1px solid #334155; border-radius: 11px; outline: none; background: #1e293b; color: #f8fafc; font: inherit; font-size: 11px; }
.modal-content input:focus, .modal-content select:focus, .modal-content textarea:focus { border-color: #818cf8; }
.modal-content input::placeholder, .modal-content textarea::placeholder { color: #64748b; }
.form-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 9px; }
.form-grid label { margin-top: 12px; }
.location-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.location-heading label { margin-bottom: 6px; }
.tabs { display: flex; gap: 3px; padding: 3px; border: 1px solid #334155; border-radius: 11px; background: #1e293b; }
.tabs button { border: 0; border-radius: 8px; padding: 7px 9px; background: transparent; color: #94a3b8; font-size: 9px; cursor: pointer; }
.tabs button.active { background: #4f46e5; color: white; font-weight: 800; }
.map-location-search { display: flex; gap: 8px; margin: 10px 0; }
.map-location-search input { flex: 1; min-width: 0; border: 1px solid #475569; border-radius: 10px; padding: 10px; background: #0f172a; color: #f8fafc; font-size: 12px; }
.map-location-search button { border: 0; border-radius: 10px; padding: 0 13px; background: #4f46e5; color: white; font-weight: 800; cursor: pointer; }
.map-location-search button:disabled { opacity: .6; }
.map-picker-wrap { position: relative; height: 300px; overflow: hidden; border: 1px solid #475569; border-radius: 15px; background: #111827; }
.real-map { width: 100%; height: 100%; z-index: 1; }
.map-hint { position: absolute; z-index: 500; top: 9px; left: 9px; padding: 6px 8px; border: 1px solid #475569; border-radius: 8px; background: #0f172add; color: #cbd5e1; font-size: 9px; pointer-events: none; }
.address-search { margin-top: 8px; }
.address-status { padding: 8px 10px; color: #a5b4fc; font-size: 10px; }
.address-results { max-height: 145px; overflow-y: auto; margin-top: 7px; border: 1px solid #334155; border-radius: 11px; background: #020617; }
.address-results button { display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px; padding: 9px; border: 0; border-bottom: 1px solid #1e293b; background: transparent; color: #e2e8f0; text-align: left; cursor: pointer; }
.address-results button:hover { background: #1e293b; }
.address-results button span { display: flex; flex-direction: column; gap: 4px; }
.address-results button b { color: #a5b4fc; font-size: 10px; }
.address-results button small { color: #cbd5e1; font-size: 9px; }
.address-results button em { color: #94a3b8; font-size: 9px; font-style: normal; }
.address-results p { padding: 10px; color: #64748b; font-size: 10px; }
.modal-content .selected-address { margin-top: 8px; border-color: #6366f177; background: #020617; color: #a5b4fc; }
.modal-actions { display: flex; gap: 8px; padding: 13px 16px; border-top: 1px solid #334155; }
.cancel-button { width: 34%; border: 0; border-radius: 12px; background: #1e293b; color: #cbd5e1; font-size: 11px; font-weight: 800; cursor: pointer; }
.modal-actions .save-button { flex: 1; padding: 12px; }
.toast { position: absolute; bottom: 82px; left: 50%; z-index: 20; max-width: 90%; padding: 10px 15px; transform: translateX(-50%); border: 1px solid #818cf866; border-radius: 30px; background: #1e293bf2; color: white; box-shadow: 0 8px 25px #0008; font-size: 10px; white-space: nowrap; }
@media (max-width: 600px) {
  .curator-app { padding: 0; }
  .device-frame, .wide-frame { width: 100%; max-width: none; height: 100dvh; min-height: 560px; border: 0; border-radius: 0; }
  .place-image { height: 180px; }
  .modal-overlay { align-items: flex-end; padding: 0; }
  .register-modal { max-height: 92dvh; border-radius: 25px 25px 0 0; }
}

.api-key-toggle { flex: 0 0 auto; }
.api-key-panel { display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding:10px 16px; border-bottom:1px solid rgba(255,255,255,.08); }
.api-key-panel input { flex:1; min-width:160px; }
.api-key-panel small { flex-basis:100%; opacity:.7; font-size:11px; }
.live-search-message { padding:8px 16px; font-size:12px; opacity:.8; }
.search-submit:disabled { opacity:.55; }
</style>
