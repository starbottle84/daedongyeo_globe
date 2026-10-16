import type { Mission } from '../../content/types';
import { ChoiceMission } from './ChoiceMission';
import { DirectionMission } from './DirectionMission';
import { PinMission } from './PinMission';
import { TapMission } from './TapMission';
import type { MissionProps } from './types';

// 미션 종류에 맞는 화면을 고른다
export function MissionView(props: MissionProps<Mission>) {
  const { mission } = props;
  switch (mission.type) {
    case 'choice':
      return <ChoiceMission {...props} mission={mission} />;
    case 'tap':
      return <TapMission {...props} mission={mission} />;
    case 'pin':
      return <PinMission {...props} mission={mission} />;
    case 'direction':
      return <DirectionMission {...props} mission={mission} />;
  }
}
