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
        <small>카카오 개발자 콘솔에서 JavaScript 키를 발급하고 현재 사이트 도메인을 등록하세요.</small>
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
              <button class="navigation-button" @click="openNavigation(place)">➤ 길찾기</button>
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
            <p class="curator-note">서버 연결 없이 장소의 설명·태그·평점을 바탕으로 추천합니다.</p>
            <div class="curator-controls"><button v-for="mood in curatorMoods" :key="mood" :class="{ active: curatorMood === mood }" @click="curatorMood = mood">{{ mood }}</button></div>
            <article v-for="place in curatorRecommendations" :key="place.id" class="curator-result">
              <img :src="place.image" :alt="place.name" @error="onImageError">
              <div><strong>{{ place.name }}</strong><p>{{ place.description }}</p><small>★ {{ Number(place.rating || 0).toFixed(1) }} · {{ place.category }}</small></div>
              <button @click="isCuratorOpen = false; searchQuery = place.name">보기</button>
            </article>
            <p v-if="!curatorRecommendations.length" class="curator-note">추천할 장소가 없습니다. 장소를 등록하거나 다른 도시를 선택해 주세요.</p>
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
            <div><strong>✨ 시크릿 명소 추가하기</strong><small>지도나 주소 검색으로 위치를 설정하세요</small></div>
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

            <div v-if="registerTab === 'map'" class="map-picker-wrap">
              <div ref="realMap" class="real-map" aria-label="실제 지도"></div>
              <div class="map-hint">지도를 이동·확대하고 원하는 위치를 터치해 핀을 선택하세요.</div>
            </div>
            <div v-else class="address-search">
              <input v-model.trim="addressSearchQuery" @input="searchAddresses" placeholder="도로명 주소 또는 건물명 입력">
              <p v-if="addressSearchLoading" class="address-status">주소 검색 중...</p>
              <div class="address-results">
                <button v-for="item in searchedAddresses" :key="item.place_id"
                        @click="selectSearchedAddress(item)">
                  <span><b>{{ item.display_name.split(',')[0] }}</b><small>{{ item.display_name }}</small></span>
                  <em>선택</em>
                </button>
                <p v-if="addressSearchQuery && !addressSearchLoading && searchedAddresses.length === 0">검색 결과가 없습니다.</p>
              </div>
            </div>
            <input class="selected-address" :value="newPlace.address" readonly placeholder="선택된 주소가 표시됩니다">

            <label>이 장소가 특별한 이유</label>
            <textarea v-model="newPlace.description" rows="2" placeholder="뷰가 멋진 창가 자리, 추천 메뉴 등 시크릿 팁을 남겨주세요."></textarea>
            <label>태그 (쉼표로 구분)</label>
            <input v-model="newPlace.tags" placeholder="오션뷰, 데이트, 분위기맛집">
            <label>이미지 주소 (선택)</label>
            <input v-model="newPlace.image" placeholder="https://...">
            <label>상세 위치 (선택)</label>
            <input v-model="newPlace.detailAddress" placeholder="예: 2층 창가 자리">
          </div>
          <footer class="modal-actions">
            <button class="cancel-button" @click="closeRegister">취소</button>
            <button class="save-button" @click="savePlace">✓ 장소 저장하기</button>
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
  { id: 1, cityId: 'seoul', name: '더 현대 서울', category: '핫플레이스', rating: 4.8, address: '서울 영등포구 여의대로 108', detailAddress: '지하 2층 팝업스토어 존', description: '도심 속 자연을 품은 혁신적인 실내 정원 사운즈 포레스트와 트렌디한 글로벌 팝업스토어 성지.', image: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80', likes: 1240, coordinates: { x: 45, y: 35 }, tags: ['쇼핑', '실내정원', '팝업스토어'] },
  { id: 2, cityId: 'seoul', name: 'N서울타워', category: '랜드마크', rating: 4.7, address: '서울 용산구 남산공원길 105', detailAddress: '전망대 타워층', description: '서울 시내를 360도 파노라마로 한눈에 감상할 수 있는 로맨틱한 대표 밤야경 힐링 스팟.', image: 'https://images.unsplash.com/photo-1538485199708-0f51451c5301?auto=format&fit=crop&w=800&q=80', likes: 980, coordinates: { x: 50, y: 40 }, tags: ['야경', '남산', '데이스코스'] },
  { id: 3, cityId: 'busan', name: '광안리 해수욕장 & M드론라이트쇼', category: '오션뷰', rating: 4.9, address: '부산 수영구 광안해변로 219', detailAddress: '민락타운 앞 해변무대', description: '화려한 광안대교 조명과 수천 대의 드론이 펼치는 밤하늘의 낭만적인 드론 쇼.', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', likes: 2150, coordinates: { x: 70, y: 75 }, tags: ['바다', '드론쇼', '광안대교'] },
  { id: 4, cityId: 'jeju', name: '사계해안 지층대', category: '인생샷', rating: 4.9, address: '제주특별자치도 서귀포시 안덕면 사계리', detailAddress: '사계항 해안도로변', description: '독특한 화산지형 지층 무늬와 구멍 뚫린 해안 바위가 어우러져 해외 여행지 같은 포토존.', image: 'https://images.unsplash.com/photo-1540206395-68808572332f?auto=format&fit=crop&w=800&q=80', likes: 1840, coordinates: { x: 25, y: 85 }, tags: ['포토존', '자연경관', '제주서부'] },
  { id: 5, cityId: 'gyeongbuk', name: '경주 동궁과 월지', category: '역사/야경', rating: 4.85, address: '경상북도 경주시 원화로 102', detailAddress: '동궁과 월지 연못 둘레길', description: '신라 왕궁의 별궁 터로 밤이 되면 연못에 반사되는 조명 건물들이 몽환적인 야경 명소.', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', likes: 890, coordinates: { x: 65, y: 60 }, tags: ['경주야경', '신라유적', '산책'] },
  { id: 6, cityId: 'gangwon', name: '강릉 안목해변 커피거리', category: '카페/바다', rating: 4.6, address: '강원특별자치도 강릉시 창해로 14', detailAddress: '카페거리 중앙 광장', description: '동해 바다 풍경을 바라보며 명품 스페셜티 커피와 디저트를 즐길 수 있는 카페 거리.', image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80', likes: 1420, coordinates: { x: 75, y: 25 }, tags: ['커피', '동해바다', '드라이브'] }
];

const CURATED_PLACES = [
  { id: 101, cityId: 'seoul', name: '경복궁', category: '명소', rating: 4.6, address: '서울특별시 경복궁', detailAddress: '', description: '경복궁 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 102, cityId: 'seoul', name: '창덕궁과 후원', category: '명소', rating: 4.6, address: '서울특별시 창덕궁과 후원', detailAddress: '', description: '창덕궁과 후원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 103, cityId: 'seoul', name: '북촌한옥마을', category: '명소', rating: 4.6, address: '서울특별시 북촌한옥마을', detailAddress: '', description: '북촌한옥마을 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 104, cityId: 'seoul', name: '인사동', category: '명소', rating: 4.6, address: '서울특별시 인사동', detailAddress: '', description: '인사동 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 105, cityId: 'seoul', name: '명동거리', category: '명소', rating: 4.6, address: '서울특별시 명동거리', detailAddress: '', description: '명동거리 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 106, cityId: 'seoul', name: '한강공원 여의도지구', category: '명소', rating: 4.6, address: '서울특별시 한강공원 여의도지구', detailAddress: '', description: '한강공원 여의도지구 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 107, cityId: 'seoul', name: '성수동 카페거리', category: '명소', rating: 4.6, address: '서울특별시 성수동 카페거리', detailAddress: '', description: '성수동 카페거리 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 108, cityId: 'seoul', name: '익선동 한옥거리', category: '명소', rating: 4.6, address: '서울특별시 익선동 한옥거리', detailAddress: '', description: '익선동 한옥거리 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 109, cityId: 'seoul', name: '광장시장', category: '명소', rating: 4.6, address: '서울특별시 광장시장', detailAddress: '', description: '광장시장 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 110, cityId: 'seoul', name: '서울숲', category: '명소', rating: 4.6, address: '서울특별시 서울숲', detailAddress: '', description: '서울숲 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 111, cityId: 'busan', name: '해운대해수욕장', category: '명소', rating: 4.6, address: '부산광역시 해운대해수욕장', detailAddress: '', description: '해운대해수욕장 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 112, cityId: 'busan', name: '광안리해수욕장', category: '명소', rating: 4.6, address: '부산광역시 광안리해수욕장', detailAddress: '', description: '광안리해수욕장 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 113, cityId: 'busan', name: '감천문화마을', category: '명소', rating: 4.6, address: '부산광역시 감천문화마을', detailAddress: '', description: '감천문화마을 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 114, cityId: 'busan', name: '태종대', category: '명소', rating: 4.6, address: '부산광역시 태종대', detailAddress: '', description: '태종대 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 115, cityId: 'busan', name: '해동용궁사', category: '명소', rating: 4.6, address: '부산광역시 해동용궁사', detailAddress: '', description: '해동용궁사 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 116, cityId: 'busan', name: '송도해상케이블카', category: '명소', rating: 4.6, address: '부산광역시 송도해상케이블카', detailAddress: '', description: '송도해상케이블카 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 117, cityId: 'busan', name: '흰여울문화마을', category: '명소', rating: 4.6, address: '부산광역시 흰여울문화마을', detailAddress: '', description: '흰여울문화마을 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 118, cityId: 'busan', name: '자갈치시장', category: '명소', rating: 4.6, address: '부산광역시 자갈치시장', detailAddress: '', description: '자갈치시장 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 119, cityId: 'busan', name: '오륙도 스카이워크', category: '명소', rating: 4.6, address: '부산광역시 오륙도 스카이워크', detailAddress: '', description: '오륙도 스카이워크 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 120, cityId: 'busan', name: '용두산공원 부산타워', category: '명소', rating: 4.6, address: '부산광역시 용두산공원 부산타워', detailAddress: '', description: '용두산공원 부산타워 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 121, cityId: 'daegu', name: '팔공산', category: '명소', rating: 4.6, address: '대구광역시 팔공산', detailAddress: '', description: '팔공산 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 122, cityId: 'daegu', name: '수성못', category: '명소', rating: 4.6, address: '대구광역시 수성못', detailAddress: '', description: '수성못 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 123, cityId: 'daegu', name: '김광석 다시그리기 길', category: '명소', rating: 4.6, address: '대구광역시 김광석 다시그리기 길', detailAddress: '', description: '김광석 다시그리기 길 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 124, cityId: 'daegu', name: '서문시장', category: '명소', rating: 4.6, address: '대구광역시 서문시장', detailAddress: '', description: '서문시장 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 125, cityId: 'daegu', name: '대구 근대골목', category: '명소', rating: 4.6, address: '대구광역시 대구 근대골목', detailAddress: '', description: '대구 근대골목 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 126, cityId: 'daegu', name: '이월드 83타워', category: '명소', rating: 4.6, address: '대구광역시 이월드 83타워', detailAddress: '', description: '이월드 83타워 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 127, cityId: 'daegu', name: '앞산전망대', category: '명소', rating: 4.6, address: '대구광역시 앞산전망대', detailAddress: '', description: '앞산전망대 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 128, cityId: 'daegu', name: '대구수목원', category: '명소', rating: 4.6, address: '대구광역시 대구수목원', detailAddress: '', description: '대구수목원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 129, cityId: 'daegu', name: '동성로', category: '명소', rating: 4.6, address: '대구광역시 동성로', detailAddress: '', description: '동성로 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 130, cityId: 'daegu', name: '국립대구박물관', category: '명소', rating: 4.6, address: '대구광역시 국립대구박물관', detailAddress: '', description: '국립대구박물관 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 131, cityId: 'incheon', name: '인천 차이나타운', category: '명소', rating: 4.6, address: '인천광역시 인천 차이나타운', detailAddress: '', description: '인천 차이나타운 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 132, cityId: 'incheon', name: '송도 센트럴파크', category: '명소', rating: 4.6, address: '인천광역시 송도 센트럴파크', detailAddress: '', description: '송도 센트럴파크 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 133, cityId: 'incheon', name: '월미도', category: '명소', rating: 4.6, address: '인천광역시 월미도', detailAddress: '', description: '월미도 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 134, cityId: 'incheon', name: '개항장 거리', category: '명소', rating: 4.6, address: '인천광역시 개항장 거리', detailAddress: '', description: '개항장 거리 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 135, cityId: 'incheon', name: '인천대공원', category: '명소', rating: 4.6, address: '인천광역시 인천대공원', detailAddress: '', description: '인천대공원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 136, cityId: 'incheon', name: '을왕리해수욕장', category: '명소', rating: 4.6, address: '인천광역시 을왕리해수욕장', detailAddress: '', description: '을왕리해수욕장 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 137, cityId: 'incheon', name: '소래포구', category: '명소', rating: 4.6, address: '인천광역시 소래포구', detailAddress: '', description: '소래포구 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 138, cityId: 'incheon', name: '강화도 전등사', category: '명소', rating: 4.6, address: '인천광역시 강화도 전등사', detailAddress: '', description: '강화도 전등사 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 139, cityId: 'incheon', name: '강화 평화전망대', category: '명소', rating: 4.6, address: '인천광역시 강화 평화전망대', detailAddress: '', description: '강화 평화전망대 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 140, cityId: 'incheon', name: '영종도 씨사이드파크', category: '명소', rating: 4.6, address: '인천광역시 영종도 씨사이드파크', detailAddress: '', description: '영종도 씨사이드파크 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 141, cityId: 'gwangju', name: '국립아시아문화전당', category: '명소', rating: 4.6, address: '광주광역시 국립아시아문화전당', detailAddress: '', description: '국립아시아문화전당 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 142, cityId: 'gwangju', name: '양림동 역사문화마을', category: '명소', rating: 4.6, address: '광주광역시 양림동 역사문화마을', detailAddress: '', description: '양림동 역사문화마을 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 143, cityId: 'gwangju', name: '무등산국립공원', category: '명소', rating: 4.6, address: '광주광역시 무등산국립공원', detailAddress: '', description: '무등산국립공원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 144, cityId: 'gwangju', name: '광주호 호수생태원', category: '명소', rating: 4.6, address: '광주광역시 광주호 호수생태원', detailAddress: '', description: '광주호 호수생태원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 145, cityId: 'gwangju', name: '펭귄마을', category: '명소', rating: 4.6, address: '광주광역시 펭귄마을', detailAddress: '', description: '펭귄마을 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 146, cityId: 'gwangju', name: '5·18민주광장', category: '명소', rating: 4.6, address: '광주광역시 5·18민주광장', detailAddress: '', description: '5·18민주광장 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 147, cityId: 'gwangju', name: '광주 예술의 거리', category: '명소', rating: 4.6, address: '광주광역시 광주 예술의 거리', detailAddress: '', description: '광주 예술의 거리 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 148, cityId: 'gwangju', name: '중외공원', category: '명소', rating: 4.6, address: '광주광역시 중외공원', detailAddress: '', description: '중외공원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 149, cityId: 'gwangju', name: '송정역시장', category: '명소', rating: 4.6, address: '광주광역시 송정역시장', detailAddress: '', description: '송정역시장 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 150, cityId: 'gwangju', name: '월봉서원', category: '명소', rating: 4.6, address: '광주광역시 월봉서원', detailAddress: '', description: '월봉서원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 151, cityId: 'daejeon', name: '한밭수목원', category: '명소', rating: 4.6, address: '대전광역시 한밭수목원', detailAddress: '', description: '한밭수목원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 152, cityId: 'daejeon', name: '엑스포과학공원', category: '명소', rating: 4.6, address: '대전광역시 엑스포과학공원', detailAddress: '', description: '엑스포과학공원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 153, cityId: 'daejeon', name: '대전 오월드', category: '명소', rating: 4.6, address: '대전광역시 대전 오월드', detailAddress: '', description: '대전 오월드 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 154, cityId: 'daejeon', name: '장태산 자연휴양림', category: '명소', rating: 4.6, address: '대전광역시 장태산 자연휴양림', detailAddress: '', description: '장태산 자연휴양림 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 155, cityId: 'daejeon', name: '계족산 황톳길', category: '명소', rating: 4.6, address: '대전광역시 계족산 황톳길', detailAddress: '', description: '계족산 황톳길 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 156, cityId: 'daejeon', name: '성심당 본점', category: '명소', rating: 4.6, address: '대전광역시 성심당 본점', detailAddress: '', description: '성심당 본점 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 157, cityId: 'daejeon', name: '대청호 오백리길', category: '명소', rating: 4.6, address: '대전광역시 대청호 오백리길', detailAddress: '', description: '대청호 오백리길 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 158, cityId: 'daejeon', name: '유성온천', category: '명소', rating: 4.6, address: '대전광역시 유성온천', detailAddress: '', description: '유성온천 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 159, cityId: 'daejeon', name: '국립중앙과학관', category: '명소', rating: 4.6, address: '대전광역시 국립중앙과학관', detailAddress: '', description: '국립중앙과학관 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 160, cityId: 'daejeon', name: '뿌리공원', category: '명소', rating: 4.6, address: '대전광역시 뿌리공원', detailAddress: '', description: '뿌리공원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 161, cityId: 'ulsan', name: '대왕암공원', category: '명소', rating: 4.6, address: '울산광역시 대왕암공원', detailAddress: '', description: '대왕암공원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 162, cityId: 'ulsan', name: '간절곶', category: '명소', rating: 4.6, address: '울산광역시 간절곶', detailAddress: '', description: '간절곶 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 163, cityId: 'ulsan', name: '태화강 국가정원', category: '명소', rating: 4.6, address: '울산광역시 태화강 국가정원', detailAddress: '', description: '태화강 국가정원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 164, cityId: 'ulsan', name: '장생포 고래문화마을', category: '명소', rating: 4.6, address: '울산광역시 장생포 고래문화마을', detailAddress: '', description: '장생포 고래문화마을 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 165, cityId: 'ulsan', name: '울산대공원', category: '명소', rating: 4.6, address: '울산광역시 울산대공원', detailAddress: '', description: '울산대공원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 166, cityId: 'ulsan', name: '반구대 암각화', category: '명소', rating: 4.6, address: '울산광역시 반구대 암각화', detailAddress: '', description: '반구대 암각화 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 167, cityId: 'ulsan', name: '십리대숲', category: '명소', rating: 4.6, address: '울산광역시 십리대숲', detailAddress: '', description: '십리대숲 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 168, cityId: 'ulsan', name: '울산대교 전망대', category: '명소', rating: 4.6, address: '울산광역시 울산대교 전망대', detailAddress: '', description: '울산대교 전망대 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 169, cityId: 'ulsan', name: '주전 몽돌해변', category: '명소', rating: 4.6, address: '울산광역시 주전 몽돌해변', detailAddress: '', description: '주전 몽돌해변 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 170, cityId: 'ulsan', name: '외고산 옹기마을', category: '명소', rating: 4.6, address: '울산광역시 외고산 옹기마을', detailAddress: '', description: '외고산 옹기마을 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 171, cityId: 'gyeonggi', name: '수원화성', category: '명소', rating: 4.6, address: '경기도 수원화성', detailAddress: '', description: '수원화성 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 172, cityId: 'gyeonggi', name: '한국민속촌', category: '명소', rating: 4.6, address: '경기도 한국민속촌', detailAddress: '', description: '한국민속촌 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 173, cityId: 'gyeonggi', name: '광명동굴', category: '명소', rating: 4.6, address: '경기도 광명동굴', detailAddress: '', description: '광명동굴 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 174, cityId: 'gyeonggi', name: '파주 임진각 평화누리', category: '명소', rating: 4.6, address: '경기도 파주 임진각 평화누리', detailAddress: '', description: '파주 임진각 평화누리 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 175, cityId: 'gyeonggi', name: '남한산성', category: '명소', rating: 4.6, address: '경기도 남한산성', detailAddress: '', description: '남한산성 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 176, cityId: 'gyeonggi', name: '아침고요수목원', category: '명소', rating: 4.6, address: '경기도 아침고요수목원', detailAddress: '', description: '아침고요수목원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 177, cityId: 'gyeonggi', name: '에버랜드', category: '명소', rating: 4.6, address: '경기도 에버랜드', detailAddress: '', description: '에버랜드 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 178, cityId: 'gyeonggi', name: '한국만화박물관', category: '명소', rating: 4.6, address: '경기도 한국만화박물관', detailAddress: '', description: '한국만화박물관 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 179, cityId: 'gyeonggi', name: '제부도', category: '명소', rating: 4.6, address: '경기도 제부도', detailAddress: '', description: '제부도 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 180, cityId: 'gyeonggi', name: '두물머리', category: '명소', rating: 4.6, address: '경기도 두물머리', detailAddress: '', description: '두물머리 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 181, cityId: 'gangwon', name: '속초 중앙시장', category: '명소', rating: 4.6, address: '강원특별자치도 속초 중앙시장', detailAddress: '', description: '속초 중앙시장 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 182, cityId: 'gangwon', name: '설악산 국립공원', category: '명소', rating: 4.6, address: '강원특별자치도 설악산 국립공원', detailAddress: '', description: '설악산 국립공원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 183, cityId: 'gangwon', name: '강릉 경포대', category: '명소', rating: 4.6, address: '강원특별자치도 강릉 경포대', detailAddress: '', description: '강릉 경포대 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 184, cityId: 'gangwon', name: '안목해변 커피거리', category: '명소', rating: 4.6, address: '강원특별자치도 안목해변 커피거리', detailAddress: '', description: '안목해변 커피거리 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 185, cityId: 'gangwon', name: '정동진', category: '명소', rating: 4.6, address: '강원특별자치도 정동진', detailAddress: '', description: '정동진 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 186, cityId: 'gangwon', name: '춘천 남이섬', category: '명소', rating: 4.6, address: '강원특별자치도 춘천 남이섬', detailAddress: '', description: '춘천 남이섬 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 187, cityId: 'gangwon', name: '평창 대관령 양떼목장', category: '명소', rating: 4.6, address: '강원특별자치도 평창 대관령 양떼목장', detailAddress: '', description: '평창 대관령 양떼목장 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 188, cityId: 'gangwon', name: '삼척 환선굴', category: '명소', rating: 4.6, address: '강원특별자치도 삼척 환선굴', detailAddress: '', description: '삼척 환선굴 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 189, cityId: 'gangwon', name: '고성 통일전망대', category: '명소', rating: 4.6, address: '강원특별자치도 고성 통일전망대', detailAddress: '', description: '고성 통일전망대 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 190, cityId: 'gangwon', name: '원주 소금산 그랜드밸리', category: '명소', rating: 4.6, address: '강원특별자치도 원주 소금산 그랜드밸리', detailAddress: '', description: '원주 소금산 그랜드밸리 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 191, cityId: 'chungbuk', name: '청주 청남대', category: '명소', rating: 4.6, address: '충청북도 청주 청남대', detailAddress: '', description: '청주 청남대 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 192, cityId: 'chungbuk', name: '속리산 법주사', category: '명소', rating: 4.6, address: '충청북도 속리산 법주사', detailAddress: '', description: '속리산 법주사 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 193, cityId: 'chungbuk', name: '단양 만천하스카이워크', category: '명소', rating: 4.6, address: '충청북도 단양 만천하스카이워크', detailAddress: '', description: '단양 만천하스카이워크 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 194, cityId: 'chungbuk', name: '도담삼봉', category: '명소', rating: 4.6, address: '충청북도 도담삼봉', detailAddress: '', description: '도담삼봉 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 195, cityId: 'chungbuk', name: '충주호 유람선', category: '명소', rating: 4.6, address: '충청북도 충주호 유람선', detailAddress: '', description: '충주호 유람선 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 196, cityId: 'chungbuk', name: '제천 의림지', category: '명소', rating: 4.6, address: '충청북도 제천 의림지', detailAddress: '', description: '제천 의림지 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 197, cityId: 'chungbuk', name: '괴산 산막이옛길', category: '명소', rating: 4.6, address: '충청북도 괴산 산막이옛길', detailAddress: '', description: '괴산 산막이옛길 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 198, cityId: 'chungbuk', name: '문경새재 도립공원', category: '명소', rating: 4.6, address: '충청북도 문경새재 도립공원', detailAddress: '', description: '문경새재 도립공원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 199, cityId: 'chungbuk', name: '옥천 정지용문학관', category: '명소', rating: 4.6, address: '충청북도 옥천 정지용문학관', detailAddress: '', description: '옥천 정지용문학관 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 200, cityId: 'chungbuk', name: '진천 농다리', category: '명소', rating: 4.6, address: '충청북도 진천 농다리', detailAddress: '', description: '진천 농다리 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 201, cityId: 'chungnam', name: '공주 공산성', category: '명소', rating: 4.6, address: '충청남도 공주 공산성', detailAddress: '', description: '공주 공산성 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 202, cityId: 'chungnam', name: '부여 궁남지', category: '명소', rating: 4.6, address: '충청남도 부여 궁남지', detailAddress: '', description: '부여 궁남지 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 203, cityId: 'chungnam', name: '부여 백제문화단지', category: '명소', rating: 4.6, address: '충청남도 부여 백제문화단지', detailAddress: '', description: '부여 백제문화단지 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 204, cityId: 'chungnam', name: '태안 꽃지해수욕장', category: '명소', rating: 4.6, address: '충청남도 태안 꽃지해수욕장', detailAddress: '', description: '태안 꽃지해수욕장 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 205, cityId: 'chungnam', name: '보령 대천해수욕장', category: '명소', rating: 4.6, address: '충청남도 보령 대천해수욕장', detailAddress: '', description: '보령 대천해수욕장 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 206, cityId: 'chungnam', name: '서산 해미읍성', category: '명소', rating: 4.6, address: '충청남도 서산 해미읍성', detailAddress: '', description: '서산 해미읍성 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 207, cityId: 'chungnam', name: '아산 외암민속마을', category: '명소', rating: 4.6, address: '충청남도 아산 외암민속마을', detailAddress: '', description: '아산 외암민속마을 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 208, cityId: 'chungnam', name: '천안 독립기념관', category: '명소', rating: 4.6, address: '충청남도 천안 독립기념관', detailAddress: '', description: '천안 독립기념관 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 209, cityId: 'chungnam', name: '예산 예당호 출렁다리', category: '명소', rating: 4.6, address: '충청남도 예산 예당호 출렁다리', detailAddress: '', description: '예산 예당호 출렁다리 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 210, cityId: 'chungnam', name: '논산 관촉사', category: '명소', rating: 4.6, address: '충청남도 논산 관촉사', detailAddress: '', description: '논산 관촉사 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 211, cityId: 'jeonbuk', name: '전주 한옥마을', category: '명소', rating: 4.6, address: '전북특별자치도 전주 한옥마을', detailAddress: '', description: '전주 한옥마을 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 212, cityId: 'jeonbuk', name: '전주 경기전', category: '명소', rating: 4.6, address: '전북특별자치도 전주 경기전', detailAddress: '', description: '전주 경기전 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 213, cityId: 'jeonbuk', name: '군산 근대역사거리', category: '명소', rating: 4.6, address: '전북특별자치도 군산 근대역사거리', detailAddress: '', description: '군산 근대역사거리 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 214, cityId: 'jeonbuk', name: '변산반도 국립공원', category: '명소', rating: 4.6, address: '전북특별자치도 변산반도 국립공원', detailAddress: '', description: '변산반도 국립공원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 215, cityId: 'jeonbuk', name: '내장산 국립공원', category: '명소', rating: 4.6, address: '전북특별자치도 내장산 국립공원', detailAddress: '', description: '내장산 국립공원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 216, cityId: 'jeonbuk', name: '남원 광한루원', category: '명소', rating: 4.6, address: '전북특별자치도 남원 광한루원', detailAddress: '', description: '남원 광한루원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 217, cityId: 'jeonbuk', name: '무주 덕유산', category: '명소', rating: 4.6, address: '전북특별자치도 무주 덕유산', detailAddress: '', description: '무주 덕유산 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 218, cityId: 'jeonbuk', name: '고창 선운사', category: '명소', rating: 4.6, address: '전북특별자치도 고창 선운사', detailAddress: '', description: '고창 선운사 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 219, cityId: 'jeonbuk', name: '익산 미륵사지', category: '명소', rating: 4.6, address: '전북특별자치도 익산 미륵사지', detailAddress: '', description: '익산 미륵사지 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 220, cityId: 'jeonbuk', name: '완주 대둔산', category: '명소', rating: 4.6, address: '전북특별자치도 완주 대둔산', detailAddress: '', description: '완주 대둔산 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 221, cityId: 'jeonnam', name: '여수 오동도', category: '명소', rating: 4.6, address: '전라남도 여수 오동도', detailAddress: '', description: '여수 오동도 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 222, cityId: 'jeonnam', name: '순천만 국가정원', category: '명소', rating: 4.6, address: '전라남도 순천만 국가정원', detailAddress: '', description: '순천만 국가정원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 223, cityId: 'jeonnam', name: '순천만습지', category: '명소', rating: 4.6, address: '전라남도 순천만습지', detailAddress: '', description: '순천만습지 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 224, cityId: 'jeonnam', name: '담양 죽녹원', category: '명소', rating: 4.6, address: '전라남도 담양 죽녹원', detailAddress: '', description: '담양 죽녹원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 225, cityId: 'jeonnam', name: '보성 녹차밭', category: '명소', rating: 4.6, address: '전라남도 보성 녹차밭', detailAddress: '', description: '보성 녹차밭 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 226, cityId: 'jeonnam', name: '목포 근대역사관', category: '명소', rating: 4.6, address: '전라남도 목포 근대역사관', detailAddress: '', description: '목포 근대역사관 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 227, cityId: 'jeonnam', name: '해남 땅끝마을', category: '명소', rating: 4.6, address: '전라남도 해남 땅끝마을', detailAddress: '', description: '해남 땅끝마을 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 228, cityId: 'jeonnam', name: '강진 다산초당', category: '명소', rating: 4.6, address: '전라남도 강진 다산초당', detailAddress: '', description: '강진 다산초당 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 229, cityId: 'jeonnam', name: '완도 청산도', category: '명소', rating: 4.6, address: '전라남도 완도 청산도', detailAddress: '', description: '완도 청산도 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 230, cityId: 'jeonnam', name: '곡성 섬진강 기차마을', category: '명소', rating: 4.6, address: '전라남도 곡성 섬진강 기차마을', detailAddress: '', description: '곡성 섬진강 기차마을 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 231, cityId: 'gyeongbuk', name: '경주 불국사', category: '명소', rating: 4.6, address: '경상북도 경주 불국사', detailAddress: '', description: '경주 불국사 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 232, cityId: 'gyeongbuk', name: '경주 첨성대', category: '명소', rating: 4.6, address: '경상북도 경주 첨성대', detailAddress: '', description: '경주 첨성대 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 233, cityId: 'gyeongbuk', name: '경주 동궁과 월지', category: '명소', rating: 4.6, address: '경상북도 경주 동궁과 월지', detailAddress: '', description: '경주 동궁과 월지 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 234, cityId: 'gyeongbuk', name: '안동 하회마을', category: '명소', rating: 4.6, address: '경상북도 안동 하회마을', detailAddress: '', description: '안동 하회마을 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 235, cityId: 'gyeongbuk', name: '포항 호미곶', category: '명소', rating: 4.6, address: '경상북도 포항 호미곶', detailAddress: '', description: '포항 호미곶 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 236, cityId: 'gyeongbuk', name: '울릉도 독도전망대', category: '명소', rating: 4.6, address: '경상북도 울릉도 독도전망대', detailAddress: '', description: '울릉도 독도전망대 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 237, cityId: 'gyeongbuk', name: '문경새재', category: '명소', rating: 4.6, address: '경상북도 문경새재', detailAddress: '', description: '문경새재 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 238, cityId: 'gyeongbuk', name: '영주 부석사', category: '명소', rating: 4.6, address: '경상북도 영주 부석사', detailAddress: '', description: '영주 부석사 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 239, cityId: 'gyeongbuk', name: '청송 주왕산', category: '명소', rating: 4.6, address: '경상북도 청송 주왕산', detailAddress: '', description: '청송 주왕산 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 240, cityId: 'gyeongbuk', name: '영덕 블루로드', category: '명소', rating: 4.6, address: '경상북도 영덕 블루로드', detailAddress: '', description: '영덕 블루로드 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 241, cityId: 'gyeongnam', name: '통영 동피랑벽화마을', category: '명소', rating: 4.6, address: '경상남도 통영 동피랑벽화마을', detailAddress: '', description: '통영 동피랑벽화마을 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 242, cityId: 'gyeongnam', name: '거제 바람의언덕', category: '명소', rating: 4.6, address: '경상남도 거제 바람의언덕', detailAddress: '', description: '거제 바람의언덕 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 243, cityId: 'gyeongnam', name: '진주성', category: '명소', rating: 4.6, address: '경상남도 진주성', detailAddress: '', description: '진주성 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 244, cityId: 'gyeongnam', name: '남해 독일마을', category: '명소', rating: 4.6, address: '경상남도 남해 독일마을', detailAddress: '', description: '남해 독일마을 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 245, cityId: 'gyeongnam', name: '합천 해인사', category: '명소', rating: 4.6, address: '경상남도 합천 해인사', detailAddress: '', description: '합천 해인사 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 246, cityId: 'gyeongnam', name: '창녕 우포늪', category: '명소', rating: 4.6, address: '경상남도 창녕 우포늪', detailAddress: '', description: '창녕 우포늪 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 247, cityId: 'gyeongnam', name: '산청 동의보감촌', category: '명소', rating: 4.6, address: '경상남도 산청 동의보감촌', detailAddress: '', description: '산청 동의보감촌 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 248, cityId: 'gyeongnam', name: '김해 가야테마파크', category: '명소', rating: 4.6, address: '경상남도 김해 가야테마파크', detailAddress: '', description: '김해 가야테마파크 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 249, cityId: 'gyeongnam', name: '밀양 영남루', category: '명소', rating: 4.6, address: '경상남도 밀양 영남루', detailAddress: '', description: '밀양 영남루 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 250, cityId: 'gyeongnam', name: '사천 바다케이블카', category: '명소', rating: 4.6, address: '경상남도 사천 바다케이블카', detailAddress: '', description: '사천 바다케이블카 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 251, cityId: 'jeju', name: '성산일출봉', category: '명소', rating: 4.6, address: '제주특별자치도 성산일출봉', detailAddress: '', description: '성산일출봉 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 252, cityId: 'jeju', name: '한라산 국립공원', category: '명소', rating: 4.6, address: '제주특별자치도 한라산 국립공원', detailAddress: '', description: '한라산 국립공원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 253, cityId: 'jeju', name: '섭지코지', category: '명소', rating: 4.6, address: '제주특별자치도 섭지코지', detailAddress: '', description: '섭지코지 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 254, cityId: 'jeju', name: '우도', category: '명소', rating: 4.6, address: '제주특별자치도 우도', detailAddress: '', description: '우도 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 255, cityId: 'jeju', name: '협재해수욕장', category: '명소', rating: 4.6, address: '제주특별자치도 협재해수욕장', detailAddress: '', description: '협재해수욕장 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 256, cityId: 'jeju', name: '천지연폭포', category: '명소', rating: 4.6, address: '제주특별자치도 천지연폭포', detailAddress: '', description: '천지연폭포 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 257, cityId: 'jeju', name: '주상절리대', category: '명소', rating: 4.6, address: '제주특별자치도 주상절리대', detailAddress: '', description: '주상절리대 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 258, cityId: 'jeju', name: '사려니숲길', category: '명소', rating: 4.6, address: '제주특별자치도 사려니숲길', detailAddress: '', description: '사려니숲길 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 259, cityId: 'jeju', name: '카멜리아힐', category: '명소', rating: 4.6, address: '제주특별자치도 카멜리아힐', detailAddress: '', description: '카멜리아힐 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 260, cityId: 'jeju', name: '용머리해안', category: '명소', rating: 4.6, address: '제주특별자치도 용머리해안', detailAddress: '', description: '용머리해안 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 261, cityId: 'sejong', name: '세종호수공원', category: '명소', rating: 4.6, address: '세종특별자치시 세종호수공원', detailAddress: '', description: '세종호수공원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 262, cityId: 'sejong', name: '국립세종수목원', category: '명소', rating: 4.6, address: '세종특별자치시 국립세종수목원', detailAddress: '', description: '국립세종수목원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 263, cityId: 'sejong', name: '금강보행교', category: '명소', rating: 4.6, address: '세종특별자치시 금강보행교', detailAddress: '', description: '금강보행교 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 264, cityId: 'sejong', name: '세종중앙공원', category: '명소', rating: 4.6, address: '세종특별자치시 세종중앙공원', detailAddress: '', description: '세종중앙공원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 265, cityId: 'sejong', name: '밀마루전망대', category: '명소', rating: 4.6, address: '세종특별자치시 밀마루전망대', detailAddress: '', description: '밀마루전망대 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 266, cityId: 'sejong', name: '정부세종청사 옥상정원', category: '명소', rating: 4.6, address: '세종특별자치시 정부세종청사 옥상정원', detailAddress: '', description: '정부세종청사 옥상정원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 267, cityId: 'sejong', name: '고복자연공원', category: '명소', rating: 4.6, address: '세종특별자치시 고복자연공원', detailAddress: '', description: '고복자연공원 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 268, cityId: 'sejong', name: '베어트리파크', category: '명소', rating: 4.6, address: '세종특별자치시 베어트리파크', detailAddress: '', description: '베어트리파크 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 269, cityId: 'sejong', name: '뒤웅박고을', category: '명소', rating: 4.6, address: '세종특별자치시 뒤웅박고을', detailAddress: '', description: '뒤웅박고을 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
  { id: 270, cityId: 'sejong', name: '조치원 전통시장', category: '명소', rating: 4.6, address: '세종특별자치시 조치원 전통시장', detailAddress: '', description: '조치원 전통시장 지역에서 방문하기 좋은 대표 명소입니다. 방문 전 운영 시간과 이용 정보를 확인하세요.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', likes: 0, tags: ['관광', '지역추천', '명소'] },
];

const EMPTY_PLACE = () => ({
  cityId: 'seoul', name: '', category: '핫플레이스', address: '',
  detailAddress: '', description: '', tags: '', image: '',
  coordinates: { x: 50, y: 50 }
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
      isPhoneFrame: true,
      dynamicIslandExpanded: false,
      activeTab: 'explore',
      isCuratorOpen: false,
      curatorMood: '전체 추천',
      curatorRegionId: 'seoul',
      curatorMoods: ['전체 추천', '맛집', '카페/디저트', '힐링/산책', '인생샷'],
      statusTime: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      batteryLevel: '—%',
      isCharging: false,
      statusTimer: null,
      batteryManager: null,
      isRegisterOpen: false,
      registerTab: 'map',
      newPlace: EMPTY_PLACE(),
      mapPin: { x: 48, y: 42, label: '서울 용산구 후암동 근처' },
      addressSearchQuery: '',
      searchedAddresses: [],
      addressSearchLoading: false,
      mapInstance: null,
      mapMarker: null,
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
  mounted() {
    try { this.kakaoAppKey = localStorage.getItem('curator_kakao_js_key') || ''; } catch (_) {}
    this.kakaoAppKeyInput = this.kakaoAppKey;
  },
  methods: {
    saveKakaoKey() {
      const key = this.kakaoAppKeyInput.trim();
      if (!key) { this.showToast('카카오 JavaScript 키를 입력해주세요.'); return; }
      this.kakaoAppKey = key;
      try { localStorage.setItem('curator_kakao_js_key', key); } catch (_) {}
      this.showApiKeyInput = false;
      this.showToast('실시간 검색 키를 저장했습니다.');
    },
    async loadKakaoPlacesSdk() {
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) return window.kakao;
      if (!this.kakaoAppKey) throw new Error('KAKAO_KEY_MISSING');
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-kakao-places-sdk]');
        if (existing) {
          if (window.kakao && window.kakao.maps && window.kakao.maps.services) { resolve(); return; }
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
          return;
        }
        const script = document.createElement('script');
        script.dataset.kakaoPlacesSdk = '1';
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(this.kakaoAppKey)}&libraries=services`;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      if (!window.kakao || !window.kakao.maps) throw new Error('KAKAO_SDK_LOAD_FAILED');
      await new Promise(resolve => window.kakao.maps.load(resolve));
      if (!window.kakao.maps.services) throw new Error('KAKAO_SERVICES_UNAVAILABLE');
      return window.kakao;
    },
    async runSearch() {
      const query = this.searchInput.trim();
      this.searchQuery = query;
      this.activeTab = 'explore';
      this.livePlaces = [];
      this.liveSearchMessage = '';
      if (!query) { this.showToast('검색어를 입력해주세요.'); return; }
      if (!this.kakaoAppKey) {
        this.showApiKeyInput = true;
        this.liveSearchMessage = '실시간 장소 검색을 사용하려면 ⚙에서 카카오 JavaScript 키를 설정하세요.';
        return;
      }
      this.liveSearchLoading = true;
      try {
        const kakao = await this.loadKakaoPlacesSdk();
        const places = new kakao.maps.services.Places();
        const regionName = this.selectedCityId === 'all' ? '' : (this.regions.find(r => r.id === this.selectedCityId)?.name || '');
        const keyword = `${regionName} ${query}`.trim();
        const result = await new Promise((resolve, reject) => {
          places.keywordSearch(keyword, (data, status, pagination) => {
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
            description: item.category_name || '카카오 로컬에서 실시간으로 검색한 장소입니다.',
            image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
            likes: 0,
            tags: [item.category_group_name || '실시간 검색', '카카오 로컬'],
            coordinates: { lat: Number(item.y), lng: Number(item.x) },
            kakaoUrl: item.place_url
          };
        });
        this.liveSearchMessage = this.livePlaces.length ? `실시간 검색 결과 ${this.livePlaces.length}곳` : '검색 결과가 없습니다. 다른 검색어를 입력해보세요.';
      } catch (error) {
        this.liveSearchMessage = error.message === 'KAKAO_KEY_MISSING'
          ? '카카오 JavaScript 키를 먼저 설정하세요.'
          : '실시간 검색에 실패했습니다. 키와 등록 도메인, 인터넷 연결을 확인하세요.';
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
      this.newPlace = { ...EMPTY_PLACE(), cityId: this.selectedCityId === 'all' ? this.regions[0].id : this.selectedCityId };
      this.registerTab = 'map';
      this.addressSearchQuery = '';
      this.mapPin = { x: 48, y: 42, label: `${this.currentRegion.name} 위치 선택` };
      this.searchedAddresses = [];
      this.isRegisterOpen = true;
      nextTick(() => this.initializeMap());
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
      if (place.kakaoUrl) { window.open(place.kakaoUrl, '_blank', 'noopener'); return; }
      const encoded = encodeURIComponent(`${place.address} ${place.name}`);
      window.open(`https://map.naver.com/v5/search/${encoded}`, '_blank', 'noopener');
      this.showToast(`${place.name} 길찾기를 연결합니다.`);
    },
    async loadLeaflet() {
      if (window.L) return window.L;
      if (!document.querySelector('link[data-leaflet-css]')) {
        const link = document.createElement('link'); link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; link.dataset.leafletCss = '1';
        document.head.appendChild(link);
      }
      await new Promise((resolve, reject) => {
        if (window.L) return resolve();
        let script = document.querySelector('script[data-leaflet-js]');
        if (script) { script.addEventListener('load', resolve, { once: true }); script.addEventListener('error', reject, { once: true }); return; }
        script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.dataset.leafletJs = '1'; script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
      });
      return window.L;
    },
    async initializeMap() {
      if (!this.$refs.realMap || this.mapInstance) return;
      try {
        const L = await this.loadLeaflet();
        if (!this.$refs.realMap) return;
        const centers = { seoul:[37.5665,126.9780], busan:[35.1796,129.0756], daegu:[35.8714,128.6014], incheon:[37.4563,126.7052], gwangju:[35.1595,126.8526], daejeon:[36.3504,127.3845], ulsan:[35.5384,129.3114], sejong:[36.4800,127.2890], gyeonggi:[37.4138,127.5183], gangwon:[37.8228,128.1555], chungbuk:[36.6357,127.4914], chungnam:[36.6588,126.6728], jeonbuk:[35.7175,127.1530], jeonnam:[34.8679,126.9910], gyeongbuk:[36.4919,128.8889], gyeongnam:[35.4606,128.2132], jeju:[33.4996,126.5312] };
        const center = this.newPlace.coordinates?.lat ? [this.newPlace.coordinates.lat, this.newPlace.coordinates.lng] : (centers[this.newPlace.cityId] || centers.seoul);
        this.mapInstance = L.map(this.$refs.realMap, { zoomControl: true }).setView(center, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(this.mapInstance);
        this.mapInstance.on('click', async e => {
          const { lat, lng } = e.latlng;
          this.newPlace.coordinates = { lat, lng };
          if (this.mapMarker) this.mapMarker.setLatLng(e.latlng);
          else this.mapMarker = L.marker(e.latlng).addTo(this.mapInstance);
          this.mapMarker.bindPopup('선택한 위치').openPopup();
          this.newPlace.address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ko`);
            if (response.ok) { const data = await response.json(); if (data.display_name) this.newPlace.address = data.display_name; }
          } catch (_) { /* 좌표 주소 표시로 유지 */ }
          this.showToast('지도 위치를 선택했습니다.');
        });
        if (this.newPlace.coordinates?.lat) this.setMapMarker(this.newPlace.coordinates.lat, this.newPlace.coordinates.lng);
        setTimeout(() => this.mapInstance?.invalidateSize(), 150);
      } catch (error) { this.showToast('지도를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.'); }
    },
    setMapMarker(lat, lng) {
      if (!this.mapInstance || !window.L) return;
      const point = [Number(lat), Number(lng)];
      this.mapInstance.setView(point, 16);
      if (this.mapMarker) this.mapMarker.setLatLng(point);
      else this.mapMarker = window.L.marker(point).addTo(this.mapInstance);
    },
    destroyMap() {
      if (this.mapInstance) { this.mapInstance.remove(); this.mapInstance = null; this.mapMarker = null; }
    },
    searchAddresses() {
      clearTimeout(this.addressSearchTimer);
      const query = this.addressSearchQuery.trim();
      this.searchedAddresses = [];
      if (query.length < 2) return;
      this.addressSearchTimer = setTimeout(async () => {
        this.addressSearchLoading = true;
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&country=kr&accept-language=ko&q=${encodeURIComponent(query)}`;
          const response = await fetch(url);
          if (response.ok) this.searchedAddresses = await response.json();
        } catch (_) { this.showToast('주소 검색에 실패했습니다. 잠시 후 다시 시도해주세요.'); }
        finally { this.addressSearchLoading = false; }
      }, 550);
    },
    selectSearchedAddress(item) {
      const lat = Number(item.lat), lng = Number(item.lon);
      this.newPlace.address = item.display_name;
      this.newPlace.coordinates = { lat, lng };
      if (!this.newPlace.name) this.newPlace.name = item.name || item.display_name.split(',')[0];
      this.searchedAddresses = [];
      this.registerTab = 'map';
      nextTick(() => this.initializeMap().then(() => this.setMapMarker(lat, lng)));
      this.showToast('검색한 주소를 지도에 표시했습니다.');
    },
    savePlace() {
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
      const place = {
        id: Date.now(),
        cityId: this.newPlace.cityId,
        name: this.newPlace.name.trim(),
        category: this.newPlace.category || '핫플레이스',
        rating: 5,
        address: this.newPlace.address,
        detailAddress: this.newPlace.detailAddress || '상세위치 정보',
        description: this.newPlace.description || '방문객들이 강력 추천하는 새로운 핫플레이스입니다.',
        image: this.newPlace.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
        likes: 1,
        coordinates: { ...this.newPlace.coordinates },
        tags
      };
      this.places.unshift(place);
      this.selectedCityId = place.cityId;
      this.searchQuery = '';
      this.searchInput = '';
      this.isRegisterOpen = false;
      this.newPlace = EMPTY_PLACE();
      this.showToast('✨ 나만의 시크릿 플레이스가 등록되었습니다!');
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
    clearInterval(this.statusTimer);
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
.dynamic-island { display:none; align-self: center; border: 0; color: inherit; font-family: inherit; min-width: 126px; height: 31px; padding: 0 13px; margin: 3px auto 8px; border-radius: 30px; background: #020202; border: 1px solid #ffffff18; display: flex; align-items: center; justify-content: space-between; gap: 10px; z-index: 5; cursor: pointer; box-shadow: 0 6px 18px #0007; transition: all .25s; }
.dynamic-island > i { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; }
.dynamic-island > span { font-size: 10px; color: #cbd5e1; font-weight: 700; }
.dynamic-island > b { width: 9px; height: 9px; border-radius: 50%; background: #6366f1; }
.dynamic-island.expanded { width: min(320px, 90%); height: 72px; border-radius: 24px; padding: 10px 13px; }
.island-detail { display: flex; align-items: center; gap: 10px; width: 100%; }
.island-detail .flag { font-size: 25px; }
.island-detail div { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.island-detail strong { font-size: 11px; }
.island-detail small { font-size: 9px; color: #a5b4fc; }
.island-detail button { border: 0; border-radius: 10px; padding: 7px 10px; background: #4f46e5; color: white; font-weight: 800; font-size: 10px; }
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
.search-area > span { color: #94a3b8; font-size: 22px; }
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
.map-picker-wrap { position: relative; height: 300px; overflow: hidden; border: 1px solid #475569; border-radius: 15px; background: #111827; }
.real-map { width: 100%; height: 100%; z-index: 1; }
.map-hint { position: absolute; z-index: 500; top: 9px; left: 9px; padding: 6px 8px; border: 1px solid #475569; border-radius: 8px; background: #0f172add; color: #cbd5e1; font-size: 9px; pointer-events: none; }
.map-pin { position: absolute; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); pointer-events: none; }
.map-pin span { max-width: 220px; margin-bottom: 3px; padding: 4px 7px; border-radius: 8px; background: #4f46e5; color: white; font-size: 8px; white-space: nowrap; }
.map-pin b { color: #fb7185; font-size: 25px; filter: drop-shadow(0 3px 3px #000); }
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