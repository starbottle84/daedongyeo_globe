// 보기 방식별 색. 위성 지도는 어두운 사진 위에 흰 글씨 + 검은 테두리로 읽히게 한다.
export type MapView = 'map' | 'satellite';

export interface Theme {
  satellite: boolean;
  text: string;
  halo: string;
  water: string;
  ocean: string;
  oceanHalo: string;
  admin1: string;
  peak: string;
  geoLine: string;
  border: string;
  borderOpacity: number;
  river: string;
  mountain: string;
  desert: string;
  flat: string;
  otherRegion: string;
}

export const LAND_COLORS = ['#f6d58e', '#b8e0a0', '#f5b5a0', '#c9b8e8', '#a8d8c8', '#f2c6de', '#e8dca0'];
export const OCEAN_COLOR = '#9fd3f0';

export const THEMES: Record<MapView, Theme> = {
  map: {
    satellite: false,
    text: '#1d2433', halo: '#ffffff',
    water: '#2f6f9f', ocean: '#2a6496', oceanHalo: 'rgba(255,255,255,0.6)',
    admin1: '#6a5f73', peak: '#7a4b1e', geoLine: '#b5482f',
    border: '#5b6270', borderOpacity: 1, river: '#4fa3d9',
    mountain: '#8b4f1d', desert: '#b06a10', flat: '#4f6b2a', otherRegion: '#3d4a66',
  },
  satellite: {
    satellite: true,
    text: '#ffffff', halo: 'rgba(0,0,0,0.75)',
    water: '#bfe3ff', ocean: '#d6ecff', oceanHalo: 'rgba(0,0,0,0.5)',
    admin1: '#e8e2f0', peak: '#ffe0b3', geoLine: '#ffb199',
    border: '#ffffff', borderOpacity: 0.6, river: '#7cc4ff',
    mountain: '#ffd2a6', desert: '#ffe08a', flat: '#d8f0b0', otherRegion: '#e6ecff',
  },
};
