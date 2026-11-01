<template>
  <div class="app-root">
    <!-- 배경 유기적 블러 효과 -->
    <div class="bg-blob blob-1"></div>
    <div class="bg-blob blob-2"></div>
    <div class="bg-blob blob-3"></div>

    <v-app class="glass-app">
      <!-- 📱 스마트폰 디바이스 프레임 토글 & 헤더 (상단 bar) -->
      <header class="app-header px-4 py-3 d-flex align-center justify-between">
        <div class="d-flex align-center gap-2">
          <v-btn
            icon="mdi-menu"
            variant="text"
            color="primary"
            class="d-lg-none"
            @click="drawer = !drawer"
          />
          <div class="brand-logo d-flex align-center gap-2">
            <div class="logo-icon">
              <v-icon color="white" size="20">mdi-compass-rose</v-icon>
            </div>
            <span class="font-weight-black text-h6 gradient-text">SpotCurator 17</span>
          </div>
        </div>

        <!-- 아이폰 17 다이내믹 아일랜드 & 뷰 모드 전환 버튼 -->
        <div class="d-flex align-center gap-2">
          <button 
            class="dynamic-island-pill" 
            :class="{ 'expanded': isIslandExpanded }" 
            @click="isIslandExpanded = !isIslandExpanded"
          >
            <span class="dot"></span>
            <span class="island-text">{{ isIslandExpanded ? 'iPhone 17 Pro Max Mode' : 'iOS 19 Vision' }}</span>
          </button>

          <v-btn
            icon
            variant="tonal"
            color="primary"
            class="rounded-circle elevation-1"
            @click="isPhoneFrame = !isPhoneFrame"
            :title="isPhoneFrame ? '전체 화면으로 보기' : '아이폰 프레임으로 보기'"
          >
            <v-icon>{{ isPhoneFrame ? 'mdi-monitor' : 'mdi-cellphone' }}</v-icon>
          </v-btn>

          <v-btn
            icon
            color="primary"
            class="add-spot-btn rounded-xl elevation-3"
            @click="openAddModal"
          >
            <v-icon color="white" size="22">mdi-plus</v-icon>
          </v-btn>
        </div>
      </header>

      <!-- 메인 레이아웃 (좌측 대한민국 17개 도시 네비게이션 + 메인 피드) -->
      <div class="app-body d-flex flex-grow-1" :class="{ 'phone-frame-container': isPhoneFrame }">
        
        <!-- 🗺️ [전국 17개 광역시·도 사이드 네비게이션] -->
        <v-navigation-drawer
          v-model="drawer"
          :permanent="$vuetify.display.lgAndUp"
          width="260"
          class="city-drawer border-0"
        >
          <div class="pa-4">
            <div class="d-flex align-center justify-between mb-3 px-2">
              <span class="text-caption font-weight-black text-grey-darken-1 tracking-wider uppercase">대한민국 17개 시·도</span>
              <v-chip size="x-small" color="primary" variant="flat" class="font-weight-bold">전국 지원</v-chip>
            </div>

            <v-list density="compact" nav class="pa-0 city-list">
              <v-list-item
                v-for="city in cities"
                :key="city.id"
                :value="city.id"
                :active="selectedCity === city.id"
                class="city-item rounded-xl mb-1.5 transition-all"
                @click="selectCity(city.id)"
              >
                <template #prepend>
                  <div class="city-icon-wrapper mr-3" :class="{ 'active': selectedCity === city.id }">
                    <v-icon size="18">{{ city.icon }}</v-icon>
                  </div>
                </template>
                <v-list-item-title class="font-weight-bold text-body-2">
                  {{ city.name }}
                </v-list-item-title>
                <template #append>
                  <v-chip size="x-small" variant="tonal" color="grey" class="font-weight-bold">
                    {{ getPlaceCount(city.id) }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-navigation-drawer>

        <!-- 📱 메인 콘텐츠 컨테이너 -->
        <v-main class="main-content flex-grow-1">
          <v-container class="pa-4 pa-sm-6 max-w-screen-md mx-auto">
            
            <!-- 상단 도시 캐러셀 칩 (모바일/서브 네비) -->
            <div class="city-scroll-wrapper mb-5">
              <v-slide-group v-model="selectedCity" show-arrows mandatory class="py-1">
                <v-slide-group-item
                  v-for="city in cities"
                  :key="city.id"
                  :value="city.id"
                  v-slot="{ toggle, isSelected }"
                >
                  <button
                    class="city-capsule-chip mr-2 px-4 py-2.5 rounded-pill transition-all d-flex align-center gap-2"
                    :class="isSelected ? 'active elevation-4' : 'default elevation-1'"
                    @click="toggle"
                  >
                    <v-icon size="16" :color="isSelected ? 'white' : 'grey-darken-2'">{{ city.icon }}</v-icon>
                    <span class="font-weight-bold text-caption">{{ city.name }}</span>
                  </button>
                </v-slide-group-item>
              </v-slide-group>
            </div>

            <!-- 검색바 & 필터 -->
            <div class="search-box-wrapper mb-6">
              <v-text-field
                v-model="searchQuery"
                prepend-inner-icon="mdi-magnify"
                placeholder="장소명, 카테고리, 도로명 주소 검색..."
                hide-details
                variant="solo"
                flat
                clearable
                class="search-bar rounded-2xl elevation-2"
              >
                <template #append-inner>
                  <v-icon color="grey-darken-1" size="20">mdi-tune-variant</v-icon>
                </template>
              </v-text-field>
            </div>

            <!-- 장소 목록 헤더 -->
            <div class="d-flex align-center justify-between mb-4 px-1">
              <h2 class="text-h6 font-weight-black text-grey-darken-4 d-flex align-center gap-2">
                <span>{{ currentCityObj.name }}</span>
                <span class="text-caption text-primary font-weight-bold bg-primary-light px-2.5 py-1 rounded-pill">
                  {{ filteredPlaces.length }}개의 추천 장소
                </span>
              </h2>
            </div>

            <!-- 명소 카드 리스트 -->
            <div class="places-grid">
              <!-- 데이터가 없을 때 -->
              <div v-if="filteredPlaces.length === 0" class="empty-state text-center py-12 pa-6 rounded-3xl elevation-1">
                <v-avatar color="indigo-lighten-5" size="80" class="mb-4">
                  <v-icon size="40" color="primary">mdi-map-marker-question-outline</v-icon>
                </v-avatar>
                <h3 class="text-h6 font-weight-black text-grey-darken-3 mb-1">등록된 장소가 없어요</h3>
                <p class="text-body-2 text-grey mb-4">선택하신 도시나 검색어에 해당하는 핫플이 없습니다.</p>
                <v-btn color="primary" variant="flat" class="rounded-xl px-6" @click="openAddModal">
                  첫번째 명소 등록하기
                </v-btn>
              </div>

              <!-- 장소 카드리스트 -->
              <div
                v-for="place in filteredPlaces"
                :key="place.id"
                class="place-card rounded-3xl pa-5 mb-4 transition-all"
              >
                <div class="d-flex align-start justify-between mb-3">
                  <div class="d-flex align-center gap-2">
                    <span class="category-tag px-3 py-1 rounded-pill text-caption font-weight-bold">
                      {{ place.category }}
                    </span>
                    <span class="text-caption text-grey font-weight-medium">{{ place.address.split(' ')[0] }}</span>
                  </div>

                  <v-btn
                    icon
                    variant="text"
                    size="small"
                    :color="place.favorite ? 'red-accent-3' : 'grey-lighten-1'"
                    @click="toggleFavorite(place)"
                  >
                    <v-icon>{{ place.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
                  </v-btn>
                </div>

                <h3 class="text-h6 font-weight-black text-grey-darken-4 mb-2">
                  {{ place.name }}
                </h3>

                <p class="text-body-2 text-grey-darken-2 mb-4 line-clamp-2 leading-relaxed">
                  {{ place.description }}
                </p>

                <div class="d-flex align-center justify-between pt-3 border-top-dashed gap-2">
                  <div class="d-flex align-center text-caption text-grey-darken-1 text-truncate">
                    <v-icon size="16" color="primary" class="mr-1">mdi-map-marker-radius</v-icon>
                    <span class="text-truncate font-weight-medium">{{ place.address }}</span>
                  </div>

                  <!-- 네이버 지도 / 카카오내비 연동 버튼 -->
                  <v-btn
                    color="#03C75A"
                    class="naver-btn text-white text-caption font-weight-bold rounded-pill px-4 elevation-0"
                    size="small"
                    @click="openNaverNavi(place)"
                  >
                    <v-icon size="16" class="mr-1">mdi-navigation</v-icon>
                    길찾기
                  </v-btn>
                </div>
              </div>
            </div>

          </v-container>
        </v-main>
      </div>

      <!-- 📍 [최신 트렌드 장소 등록 모달: 지도 선택 & 우편번호 검색 포함] -->
      <v-dialog v-model="dialog" max-width="480px" transition="dialog-bottom-transition" persistent>
        <v-card class="register-modal rounded-3xl pa-2">
          <v-card-title class="d-flex align-center justify-between pt-4 px-4 pb-2">
            <div>
              <span class="text-caption text-primary font-weight-bold uppercase">New Secret Spot</span>
              <h3 class="text-h6 font-weight-black text-grey-darken-4 mt-n1">✨ 나만의 명소 등록하기</h3>
            </div>
            <v-btn icon variant="text" size="small" @click="dialog = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>

          <v-card-text class="pt-2">
            <!-- 등록 방법 탭 (주소 직접/검색 vs 지도 핀 찍기) -->
            <v-tabs v-model="inputMode" color="primary" align-tabs="center" grow class="mb-4 input-mode-tabs rounded-xl">
              <v-tab value="address" class="text-caption font-weight-bold">
                <v-icon size="16" class="mr-1">mdi-textbox-password</v-icon> 주소 검색 / 입력
              </v-tab>
              <v-tab value="map" class="text-caption font-weight-bold">
                <v-icon size="16" class="mr-1">mdi-map-marker-check</v-icon> 지도에서 핀 선택
              </v-tab>
            </v-tabs>

            <!-- 도시 선택 -->
            <v-select
              v-model="newPlace.cityId"
              :items="cities"
              item-title="name"
              item-value="id"
              label="소속 도시 선택"
              variant="outlined"
              density="comfortable"
              class="rounded-xl mb-3"
              hide-details
            ></v-select>

            <!-- 장소 이름 -->
            <v-text-field
              v-model="newPlace.name"
              label="명소 / 장소 이름 (예: 성수 디저트 카페)"
              variant="outlined"
              density="comfortable"
              class="rounded-xl mb-3"
              hide-details
            ></v-text-field>

            <!-- 카테고리 선택 -->
            <v-combobox
              v-model="newPlace.category"
              :items="categorySuggestions"
              label="카테고리 (예: 카페, 뷰맛집, 랜드마크)"
              variant="outlined"
              density="comfortable"
              class="rounded-xl mb-3"
              hide-details
            ></v-combobox>

            <!-- 1. 주소 직접/자동 검색 모드 -->
            <div v-if="inputMode === 'address'" class="mb-3">
              <div class="d-flex gap-2 mb-2">
                <v-text-field
                  v-model="newPlace.address"
                  label="도로명 주소"
                  variant="outlined"
                  density="comfortable"
                  class="rounded-xl flex-grow-1"
                  hide-details
                ></v-text-field>
                <v-btn
                  color="indigo-darken-1"
                  variant="flat"
                  class="rounded-xl px-4 text-caption font-weight-bold"
                  style="height: 48px;"
                  @click="searchAddressApi"
                >
                  주소 찾기
                </v-btn>
              </div>

              <!-- 주소 검색 연동 가상 팝업 결과 -->
              <div v-if="addressSearchResults.length > 0" class="address-result-box pa-2 rounded-xl border mb-3">
                <div class="text-caption text-grey font-weight-bold mb-1 px-2">검색 결과 목록 (클릭시 자동입력)</div>
                <div
                  v-for="(addr, i) in addressSearchResults"
                  :key="i"
                  class="addr-item pa-2 rounded-lg cursor-pointer hover:bg-slate-100 text-caption font-weight-medium"
                  @click="applySearchedAddress(addr)"
                >
                  <v-icon size="14" color="primary" class="mr-1">mdi-map-marker-outline</v-icon>
                  {{ addr }}
                </div>
              </div>
            </div>

            <!-- 2. 인터랙티브 지도 핀 선택 모드 -->
            <div v-else class="map-picker-container mb-3">
              <div class="map-mockup rounded-2xl relative overflow-hidden" @click="onMapClick">
                <div class="map-grid-overlay"></div>
                <div class="map-instruction">지도를 터치하여 위치 핀을 찍으세요</div>
                
                <!-- 동적 마커 -->
                <div
                  class="map-marker-pin"
                  :style="{ left: pinPos.x + '%', top: pinPos.y + '%' }"
                >
                  <v-icon color="red" size="32">mdi-map-marker</v-icon>
                  <div class="pin-pulse"></div>
                </div>
              </div>
              <div class="text-caption text-grey-darken-1 mt-1 text-center font-weight-medium">
                선택 좌표: 위도 {{ pinCoords.lat }}, 경도 {{ pinCoords.lng }}
              </div>
            </div>

            <!-- 상세 설명 -->
            <v-textarea
              v-model="newPlace.description"
              label="이 장소에 대한 매력적인 소개글을 남겨주세요."
              variant="outlined"
              density="comfortable"
              rows="3"
              class="rounded-xl"
              hide-details
            ></v-textarea>
          </v-card-text>

          <v-card-actions class="px-4 pb-4">
            <v-btn
              block
              color="primary"
              size="large"
              class="rounded-2xl py-3 font-weight-black elevation-4"
              @click="addPlace"
            >
              장소 저장 및 등록 완료
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-app>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      drawer: null,
      isPhoneFrame: false,
      isIslandExpanded: false,
      selectedCity: 'seoul', // 기존 ID 타입 불일치 버그 수정 (String 통일)
      searchQuery: '',
      dialog: false,
      inputMode: 'address', // 'address' | 'map'
      
      // 대한민국 17개 광역시·도 완벽 정의
      cities: [
        { id: 'seoul', name: '서울특별시', icon: 'mdi-city-variant' },
        { id: 'busan', name: '부산광역시', icon: 'mdi-waves' },
        { id: 'daegu', name: '대구광역시', icon: 'mdi-image-filter-hdr' },
        { id: 'incheon', name: '인천광역시', icon: 'mdi-airplane' },
        { id: 'gwangju', name: '광주광역시', icon: 'mdi-white-balance-sunny' },
        { id: 'daejeon', name: '대전광역시', icon: 'mdi-atom' },
        { id: 'ulsan', name: '울산광역시', icon: 'mdi-factory' },
        { id: 'sejong', name: '세종특별자치시', icon: 'mdi-office-building-marker' },
        { id: 'gyeonggi', name: '경기도', icon: 'mdi-home-city' },
        { id: 'gangwon', name: '강원특별자치도', icon: 'mdi-tree' },
        { id: 'chungbuk', name: '충청북도', icon: 'mdi-sprout' },
        { id: 'chungnam', name: '충청남도', icon: 'mdi-barley' },
        { id: 'jeonbuk', name: '전북특별자치도', icon: 'mdi-rice' },
        { id: 'jeonnam', name: '전라남도', icon: 'mdi-sail-boat' },
        { id: 'gyeongbuk', name: '경상북도', icon: 'mdi-castle' },
        { id: 'gyeongnam', name: '경상남도', icon: 'mdi-bridge' },
        { id: 'jeju', name: '제주특별자치도', icon: 'mdi-palm-tree' },
      ],

      categorySuggestions: ['핫플레이스', '카페', '맛집', '랜드마크', '힐링스팟', '야경명소', '오션뷰'],

      // 등록 모달 상태
      newPlace: {
        cityId: 'seoul',
        name: '',
        category: '핫플레이스',
        address: '',
        description: '',
      },

      // 주소 검색 API 결과 가상 시뮬레이터
      addressSearchResults: [],

      // 지도 선택 위치 상태
      pinPos: { x: 50, y: 50 },
      pinCoords: { lat: 37.5665, lng: 126.9780 },

      // 데이터 샘플
      places: [
        {
          id: 1,
          cityId: 'seoul',
          name: '더 현대 서울',
          category: '핫플레이스',
          address: '서울 영등포구 여의대로 108',
          description: '도심 속 자연을 품은 실내 정원과 최신 트렌드 팝업스토어 성지.',
          favorite: true,
        },
        {
          id: 2,
          cityId: 'seoul',
          name: 'N서울타워',
          category: '랜드마크',
          address: '서울 용산구 남산공원길 105',
          description: '서울의 전경을 360도 파노라마로 감상할 수 있는 로맨틱 야경 명소.',
          favorite: false,
        },
        {
          id: 3,
          cityId: 'busan',
          name: '광안리 해수욕장',
          category: '오션뷰',
          address: '부산 수영구 광안해변로 219',
          description: '화려한 광안대교 야경과 드론쇼를 즐길 수 있는 대표 해변.',
          favorite: true,
        },
        {
          id: 4,
          cityId: 'ulsan',
          name: '태화강 국가정원 (십리대숲)',
          category: '힐링스팟',
          address: '울산 중구 태화강국가정원길 154',
          description: '강변을 따라 끝없이 펼쳐진 은하수 대나무 숲길과 대규모 생태정원.',
          favorite: true,
        },
        {
          id: 5,
          cityId: 'jeju',
          name: '사계해안',
          category: '인생샷명소',
          address: '제주특별자치도 서귀포시 안덕면 사계리',
          description: '지층 무늬와 독특한 해안 지형이 어우러진 이국적인 제주 바다.',
          favorite: false,
        },
      ],
    };
  },
  computed: {
    currentCityObj() {
      return this.cities.find((c) => c.id === this.selectedCity) || this.cities[0];
    },
    filteredPlaces() {
      return this.places.filter((p) => {
        // 기존 ID 타입 불일치 버그 완벽 수정
        const matchesCity = String(p.cityId) === String(this.selectedCity);
        const query = this.searchQuery.toLowerCase().trim();
        const matchesQuery =
          !query ||
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.address.toLowerCase().includes(query);

        return matchesCity && matchesQuery;
      });
    },
  },
  methods: {
    selectCity(cityId) {
      this.selectedCity = cityId;
    },
    getPlaceCount(cityId) {
      return this.places.filter((p) => String(p.cityId) === String(cityId)).length;
    },
    toggleFavorite(place) {
      place.favorite = !place.favorite;
    },
    openNaverNavi(place) {
      const encodedAddr = encodeURIComponent(place.address + ' ' + place.name);
      const naverMapUrl = `https://map.naver.com/v5/search/${encodedAddr}`;
      window.open(naverMapUrl, '_blank');
    },
    openAddModal() {
      this.newPlace.cityId = this.selectedCity;
      this.dialog = true;
    },
    
    // 주소 검색 API 시뮬레이터 (우편번호 / 도로명)
    searchAddressApi() {
      if (!this.newPlace.address) {
        alert('검색할 도로명이나 지역 이름을 입력해주세요.');
        return;
      }
      const base = this.currentCityObj.name;
      this.addressSearchResults = [
        `${base} 센터로 123 (가상 우편번호 06123)`,
        `${base} 테헤란로 456번길 7 (가상 우편번호 06456)`,
        `${base} 중앙로 89 (가상 우편번호 06789)`,
      ];
    },
    applySearchedAddress(addr) {
      this.newPlace.address = addr;
      this.addressSearchResults = [];
    },

    // 인터랙티브 지도 클릭 핀 선택
    onMapClick(e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      this.pinPos = { x: Math.round(x), y: Math.round(y) };
      
      // 좌표 기반 임의 지오코딩 변환 시뮬레이션
      this.pinCoords = {
        lat: (37.5 + (100 - y) * 0.01).toFixed(4),
        lng: (126.9 + x * 0.01).toFixed(4),
      };
      
      this.newPlace.address = `${this.currentCityObj.name} 스마트 시티 핀 지점 (${this.pinCoords.lat}, ${this.pinCoords.lng})`;
    },

    // 장소 추가 (버그 수정: 폼 초기화 및 추가 후 생성 위치로 즉시 선택)
    addPlace() {
      if (!this.newPlace.name || !this.newPlace.address) {
        alert('명소 이름과 주소는 필수 입력 사항입니다!');
        return;
      }

      const createdSpot = {
        id: Date.now(),
        cityId: this.newPlace.cityId,
        name: this.newPlace.name,
        category: this.newPlace.category || '핫플레이스',
        address: this.newPlace.address,
        description: this.newPlace.description || '새롭게 등록된 추천 핫플레이스입니다.',
        favorite: false,
      };

      this.places.unshift(createdSpot);

      // 내가 추가한 장소의 도시로 자동 이동
      this.selectedCity = this.newPlace.cityId;

      // 폼 리셋
      this.newPlace = {
        cityId: this.selectedCity,
        name: '',
        category: '핫플레이스',
        address: '',
        description: '',
      };
      this.addressSearchResults = [];
      this.dialog = false;
    },
  },
};
</script>

<style scoped>
/* 🎨 iOS 19 & 아이폰 17 스타일 테마 시스템 */
.app-root {
  min-height: 100vh;
  background-color: #0f172a;
  position: relative;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Pretendard', sans-serif;
}

.glass-app {
  background: transparent !important;
}

/* 유기적 그라데이션 블러 데코레이션 */
.bg-blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(90px);
  z-index: 0;
  opacity: 0.35;
  pointer-events: none;
}
.blob-1 { top: -80px; left: -80px; width: 350px; height: 350px; background: #6366f1; }
.blob-2 { top: 45%; right: -100px; width: 400px; height: 400px; background: #a855f7; }
.blob-3 { bottom: -80px; left: 30%; width: 380px; height: 380px; background: #06b6d4; }

/* 📱 아이폰 17 다이내믹 아일랜드 캡슐 */
.dynamic-island-pill {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 6px 14px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  color: white;
}
.dynamic-island-pill:hover {
  transform: scale(1.05);
}
.dynamic-island-pill.expanded {
  padding: 8px 20px;
  background: #000;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
}
.dynamic-island-pill .dot {
  width: 8px;
  height: 8px;
  background-color: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 8px #10b981;
}
.island-text {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

/* 헤더 & 브랜드 */
.app-header {
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
}
.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  display: flex;
  align-center: center;
  justify-content: center;
}
.gradient-text {
  background: linear-gradient(135deg, #4f46e5 0%, #9333ea 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 🗺️ 도시 네비게이션 서랍 */
.city-drawer {
  background: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(226, 232, 240, 0.8) !important;
}
.city-icon-wrapper {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.city-icon-wrapper.active {
  background: #6366f1;
  color: white;
}

/* 상단 캡슐 캐러셀 탭 */
.city-capsule-chip {
  border: 1px solid #e2e8f0;
  background: white;
  cursor: pointer;
}
.city-capsule-chip.default:hover {
  background: #f8fafc;
}
.city-capsule-chip.active {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: white;
  border-color: transparent;
}

/* 명소 카드 UI 디자인 */
.place-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.04);
}
.place-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 35px -5px rgba(99, 102, 241, 0.12);
}

.category-tag {
  background: #e0e7ff;
  color: #4338ca;
}

.naver-btn {
  background-color: #03C75A !important;
}

.border-top-dashed {
  border-top: 1px dashed #e2e8f0;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 📍 지도 인터랙션 선택 시뮬레이터 */
.map-picker-container {
  border: 1px solid #e2e8f0;
  padding: 6px;
  border-radius: 16px;
}
.map-mockup {
  height: 160px;
  background: #e2e8f0;
  background-image: radial-gradient(#cbd5e1 1.5px, transparent 1.5px);
  background-size: 16px 16px;
  cursor: crosshair;
  position: relative;
}
.map-instruction {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.7);
  color: white;
  font-size: 10px;
  padding: 4px 10px;
  border-radius: 12px;
  pointer-events: none;
}
.map-marker-pin {
  position: absolute;
  transform: translate(-50%, -100%);
  pointer-events: none;
}
.pin-pulse {
  width: 12px;
  height: 12px;
  background: rgba(239, 68, 68, 0.4);
  border-radius: 50%;
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: translateX(-50%) scale(1); opacity: 1; }
  100% { transform: translateX(-50%) scale(3); opacity: 0; }
}

/* 주소 연동 결과 선택 영역 */
.address-result-box {
  background: #f8fafc;
  max-height: 120px;
  overflow-y: auto;
}
.addr-item:hover {
  background: #e0e7ff;
  color: #4338ca;
}
</style>
