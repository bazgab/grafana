import { createSelector } from 'reselect';

// @todo: replace barrel import path
import { StoreState, useSelector } from 'app/types/index';

import { UnifiedAlertingState } from '../state/reducers';

export function useUnifiedAlertingSelector<TSelected = unknown>(
  selector: (state: UnifiedAlertingState) => TSelected,
  equalityFn?: (left: TSelected, right: TSelected) => boolean
): TSelected {
  return useSelector(
    createSelector(
      (state: StoreState) => state.unifiedAlerting,
      (unifiedAlerting) => selector(unifiedAlerting)
    ),
    equalityFn
  );
}
