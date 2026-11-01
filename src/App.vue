<template>
  <v-app class="trendy-app">
    <!-- 배경을 은은하게 채워주는 블러 그라데이션 데코레이션 요소 -->
    <div class="bg-blob blob-1"></div>
    <div class="bg-blob blob-2"></div>

    <v-main class="main-container">
      <v-container class="py-6 px-4" style="max-width: 480px;">
        
        <!-- 헤더 섹션 -->
        <div class="d-flex align-center justify-between mb-6">
          <div>
            <span class="text-caption font-weight-bold text-primary tracking-widest uppercase">Travel Curator</span>
            <h1 class="text-h4 font-weight-black text-grey-darken-4 mt-n1">
              도시별 시크릿 <span class="gradient-text">플레이스</span>
            </h1>
          </div>
          <v-btn
            icon
            color="white"
            class="elevation-2 rounded-xl add-btn-pulse"
            @click="dialog = true"
          >
            <v-icon color="primary" size="24">mdi-plus</v-icon>
          </v-btn>
        </div>

        <!-- 도시 선택 캐러셀 탭 (필수 태그 구조) -->
        <div class="city-tabs-wrapper mb-6">
          <v-slide-group v-model="selectedCity" show-arrows class="py-1" mandatory>
            <v-slide-group-item
              v-for="city in cities"
              :key="city.id"
              v-slot="{ toggle, isSelected }"
            >
              <div
                class="city-chip mx-1 px-4 py-2 rounded-xl d-flex align-center cursor-pointer transition-all"
                :class="isSelected ? 'city-chip-active elevation-3' : 'city-chip-default elevation-1'"
                @click="toggle"
              >
                <v-icon size="18" class="mr-2" :color="isSelected ? 'white' : 'grey-darken-1'">
                  {{ city.icon }}
                </v-icon>
                <span class="font-weight-bold text-body-2" :class="isSelected ? 'white--text' : 'text-grey-darken-2'">
                  {{ city.name }}
                </span>
              </div>
            </v-slide-group-item>
          </v-slide-group>
        </div>

        <!-- 검색 바 (글래스모피즘 효과 적용) -->
        <div class="mb-6">
          <v-text-field
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            placeholder="어떤 멋진 장소를 찾고 계신가요?"
            hide-details
            dense
            flat
            solo
            class="search-bar rounded-xl elevation-1"
          ></v-text-field>
        </div>

        <!-- 명소 카드 리스트 -->
        <div class="place-list">
          <div v-if="filteredPlaces.length === 0" class="text-center py-12">
            <v-avatar color="grey-lighten-3" size="72" class="mb-3">
              <v-icon size="36" color="grey-darken-1">mdi-compass-off-outline</v-icon>
            </v-avatar>
            <h3 class="text-h6 font-weight-bold text-grey-darken-2">등록된 명소가 없어요</h3>
            <p class="text-body-2 text-grey">우측 상단 + 버튼을 눌러 나만의 명소를 추가해보세요!</p>
          </div>

          <v-card
            v-for="place in filteredPlaces"
            :key="place.id"
            class="place-card rounded-2xl mb-4 elevation-2 overflow-hidden border-card"
          >
            <div class="card-content pa-5">
              <div class="d-flex align-start justify-between mb-2">
                <div>
                  <span class="category-badge px-2.5 py-1 rounded-lg text-caption font-weight-bold mr-2">
                    {{ place.category }}
                  </span>
                  <span class="text-caption text-grey">{{ place.address.split(' ')[0] }}</span>
                </div>
                <v-btn icon x-small class="text-grey-lighten-1" variant="text">
                  <v-icon>mdi-heart-outline</v-icon>
                </v-btn>
              </div>

              <h3 class="text-h6 font-weight-bold text-grey-darken-4 mb-1">
                {{ place.name }}
              </h3>
              
              <p class="text-body-2 text-grey-darken-1 mb-4 line-clamp-2">
                {{ place.description }}
              </p>

              <div class="d-flex align-center justify-between pt-2 border-top-dash">
                <div class="d-flex align-center text-caption text-grey-darken-1 text-truncate mr-2">
                  <v-icon size="14" color="primary" class="mr-1">mdi-map-marker</v-icon>
                  <span class="text-truncate">{{ place.address }}</span>
                </div>

                <!-- 네이버 내비 바로가기 스타일 버튼 -->
                <v-btn
                  color="#03C75A"
                  class="naver-btn text-white text-caption font-weight-bold rounded-pill px-4 py-2"
                  elevation="0"
                  @click="openNaverNavi(place)"
                >
                  <v-icon size="16" class="mr-1">mdi-navigation-variant</v-icon>
                  길찾기
                </v-btn>
              </div>
            </div>
          </v-card>
        </div>

        <!-- 명소 등록 모달 (현대적인 다이얼로그 디자인) -->
        <v-dialog v-model="dialog" max-width="440px" transition="dialog-bottom-transition">
          <v-card class="rounded-3xl pa-2">
            <v-card-title class="d-flex align-center justify-between pt-4 px-4">
              <span class="text-h6 font-weight-black text-grey-darken-4">✨ 새로운 명소 기록하기</span>
              <v-btn icon x-small @click="dialog = false" variant="text">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </v-card-title>
            
            <v-card-text class="pt-4">
              <v-select
                v-model="newPlace.cityId"
                :items="cities"
                item-title="name"
                item-value="id"
                label="도시 선택"
                variant="outlined"
                density="comfortable"
                class="rounded-xl mb-3"
                hide-details
              ></v-select>
              
              <v-text-field
                v-model="newPlace.name"
                label="명소 이름 (예: 한강공원)"
                variant="outlined"
                density="comfortable"
                class="rounded-xl mb-3"
                hide-details
              ></v-text-field>

              <v-text-field
                v-model="newPlace.category"
                label="카테고리 (예: 카페, 랜드마크, 맛집)"
                variant="outlined"
                density="comfortable"
                class="rounded-xl mb-3"
                hide-details
              ></v-text-field>

              <v-text-field
                v-model="newPlace.address"
                label="도로명 주소"
                variant="outlined"
                density="comfortable"
                class="rounded-xl mb-3"
                hide-details
              ></v-text-field>

              <v-textarea
                v-model="newPlace.description"
                label="이 장소가 특별한 이유는 무엇인가요?"
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
                class="rounded-xl py-4 font-weight-bold text-subtitle-1 elevation-2"
                @click="addPlace"
              >
                장소 저장하기
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

      </v-container>
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      selectedCity: 1,
      searchQuery: '',
      dialog: false,
      cities: [
        { id: 1, name: '서울', icon: 'mdi-city-variant' },
        { id: 2, name: '부산', icon: 'mdi-waves' },
        { id: 3, name: '제주', icon: 'mdi-palm-tree' },
        { id: 4, name: '경주', icon: 'mdi-bank' },
      ],
      newPlace: {
        cityId: 1,
        name: '',
        category: '',
        address: '',
        description: '',
      },
      places: [
        {
          id: 1,
          cityId: 1,
          name: '더 현대 서울',
          category: '핫플레이스',
          address: '서울 영등포구 여의대로 108',
          description: '도심 속 자연을 품은 혁신적인 실내 정원과 트렌디한 팝업스토어 성지.',
        },
        {
          id: 2,
          cityId: 1,
          name: 'N서울타워',
          category: '랜드마크',
          address: '서울 용산구 남산공원길 105',
          description: '서울의 전경을 360도 파노라마로 감상할 수 있는 로맨틱한 야경 명소.',
        },
        {
          id: 3,
          cityId: 2,
          name: '광안리 해수욕장',
          category: '오션뷰',
          address: '부산 수영구 광안해변로 219',
          description: '화려한 광안대교 야경과 바다를 동시에 즐기는 낭만적인 해변.',
        },
        {
          id: 4,
          cityId: 3,
          name: '사계해안',
          category: '인생샷명소',
          address: '제주특별자치도 서귀포시 안덕면 사계리',
          description: '지층 무늬와 독특한 해안 지형이 어우러져 이국적인 분위기를 뽐내는 곳.',
        },
      ],
    };
  },
  computed: {
    filteredPlaces() {
      return this.places.filter(
        (p) =>
          p.cityId === this.selectedCity &&
          (p.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(this.searchQuery.toLowerCase()))
      );
    },
  },
  methods: {
    openNaverNavi(place) {
      const encodedName = encodeURIComponent(place.name);
      const encodedAddr = encodeURIComponent(place.address);
      // 네이버 지도 길찾기 웹/앱 자동 연동 스키마
      const naverMapUrl = `https://map.naver.com/v5/search/${encodedAddr} ${encodedName}`;
      window.open(naverMapUrl, '_blank');
    },
    addPlace() {
      if (!this.newPlace.name || !this.newPlace.address) {
        alert('명소 이름과 주소는 꼭 입력해주세요!');
        return;
      }
      this.places.unshift({
        id: Date.now(),
        ...this.newPlace,
      });
      this.newPlace = { cityId: this.selectedCity, name: '', category: '', address: '', description: '' };
      this.dialog = false;
    },
  },
};
</script>

<style scoped>
/* 트렌디한 배경 및 컬러 스타일 */
.trendy-app {
  background-color: #f8fafc;
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* 배경 은은한 무드 블롭 효과 */
.bg-blob {
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.4;
}
.blob-1 {
  top: -50px;
  left: -50px;
  background: #e0e7ff;
}
.blob-2 {
  top: 40%;
  right: -80px;
  background: #ccfbf1;
}

.main-container {
  position: relative;
  z-index: 1;
}

/* 텍스트 그라데이션 효과 */
.gradient-text {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 도시 칩 디자인 */
.city-chip {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}
.city-chip-default {
  background-color: #ffffff;
  border: 1px solid #f1f5f9;
}
.city-chip-active {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: white;
}

/* 서치바 스타일링 커스텀 */
.search-bar :deep(.v-field) {
  border-radius: 16px !important;
  background-color: #ffffff !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03) !important;
}

/* 카드 UI 트렌디 스타일 */
.place-card {
  background: #ffffff;
  border: 1px solid rgba(241, 245, 249, 0.8);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.place-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05) !important;
}

/* 카테고리 뱃지 디자인 */
.category-badge {
  background-color: #e0e7ff;
  color: #4f46e5;
  letter-spacing: -0.3px;
}

/* 네이버 내비 버튼 커스텀 */
.naver-btn {
  background-color: #03C75A !important;
  letter-spacing: -0.2px;
  transition: opacity 0.2s;
}
.naver-btn:hover {
  opacity: 0.9;
}

/* 구분선 대시 스타일 */
.border-top-dash {
  border-top: 1px dashed #f1f5f9;
}

/* 말줄임 유틸 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>