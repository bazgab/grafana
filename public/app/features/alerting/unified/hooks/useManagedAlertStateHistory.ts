import { useEffect } from 'react';

// @todo: replace barrel import path
import { useDispatch } from 'app/types/index';
import { StateHistoryItem } from 'app/types/unified-alerting';

import { fetchGrafanaAnnotationsAction } from '../state/actions';
import { AsyncRequestState } from '../utils/redux';

import { useUnifiedAlertingSelector } from './useUnifiedAlertingSelector';

export function useManagedAlertStateHistory(alertId: string) {
  const dispatch = useDispatch();
  const history = useUnifiedAlertingSelector<AsyncRequestState<StateHistoryItem[]>>(
    (state) => state.managedAlertStateHistory
  );

  useEffect(() => {
    dispatch(fetchGrafanaAnnotationsAction(alertId));
  }, [dispatch, alertId]);

  return history;
}
