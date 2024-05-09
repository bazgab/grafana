import { render, screen, waitFor } from '@testing-library/react';
import { KBarProvider } from 'kbar';
import React from 'react';
import { Provider } from 'react-redux';
import { match, Router } from 'react-router-dom';
import { useEffectOnce } from 'react-use';
import { mockToolkitActionCreator } from 'test/core/redux/mocks';
import { TestProvider } from 'test/helpers/TestProvider';
import { getGrafanaContextMock } from 'test/mocks/getGrafanaContextMock';

import { createTheme } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { config, locationService, setDataSourceSrv } from '@grafana/runtime';
import { Dashboard } from '@grafana/schema';
// @todo: replace barrel import path
import { notifyApp } from 'app/core/actions/index';
import { AppChrome } from 'app/core/components/AppChrome/AppChrome';
import { GrafanaContext } from 'app/core/context/GrafanaContext';
import { getRouteComponentProps } from 'app/core/navigation/__mocks__/routeProps';
import { RouteDescriptor } from 'app/core/navigation/types';
import { HOME_NAV_ID } from 'app/core/reducers/navModel';
// @todo: replace barrel import path
import { DashboardInitPhase, DashboardMeta, DashboardRoutes } from 'app/types/index';

import { configureStore } from '../../../store/configureStore';
import { Props as LazyLoaderProps } from '../dashgrid/LazyLoader';
import { DashboardSrv, setDashboardSrv } from '../services/DashboardSrv';
// @todo: replace barrel import path
import { createDashboardModelFixture } from '../state/__fixtures__/dashboardFixtures';
import { DashboardModel } from '../state/index';

import { Props, UnthemedDashboardPage } from './DashboardPage';

jest.mock('app/features/dashboard/dashgrid/LazyLoader', () => {
  const LazyLoader = ({ children, onLoad }: Pick<LazyLoaderProps, 'children' | 'onLoad'>) => {
    useEffectOnce(() => {
      onLoad?.();
    });
    return <>{typeof children === 'function' ? children({ isInView: true }) : children}</>;
  };
  return { LazyLoader };
});

jest.mock('app/features/dashboard/components/DashboardSettings/GeneralSettings', () => {
  class GeneralSettings extends React.Component<{}, {}> {
    render() {
      return <>general settings</>;
    }
  }

  return { GeneralSettings };
});

jest.mock('app/features/query/components/QueryGroup', () => {
  return {
    QueryGroup: () => null,
  };
});

jest.mock('app/core/core', () => ({
  appEvents: {
    subscribe: () => {
      return { unsubscribe: () => {} };
    },
  },
  contextSrv: {
    user: { orgId: 1 },
  },
}));

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getPluginLinkExtensions: jest.fn().mockReturnValue({ extensions: [] }),
  usePluginLinkExtensions: jest.fn().mockReturnValue({ extensions: [] }),
}));

function getTestDashboard(overrides?: Partial<Dashboard>, metaOverrides?: Partial<DashboardMeta>): DashboardModel {
  const data = Object.assign(
    {
      title: 'My dashboard',
      panels: [
        {
          id: 1,
          type: 'timeseries',
          title: 'My panel title',
          gridPos: { x: 0, y: 0, w: 1, h: 1 },
        },
      ],
    },
    overrides
  );

  return createDashboardModelFixture(data, metaOverrides);
}

const mockInitDashboard = jest.fn();
const mockCleanUpDashboardAndVariables = jest.fn();

function setup(propOverrides?: Partial<Props>) {
  config.bootData.navTree = [
    { text: 'Dashboards', id: 'dashboards/browse' },
    { text: 'Home', id: HOME_NAV_ID },
    {
      text: 'Help',
      id: 'help',
    },
  ];

  const store = configureStore();
  const props: Props = {
    ...getRouteComponentProps({
      match: { params: { slug: 'my-dash', uid: '11' } } as unknown as match,
      route: { routeName: DashboardRoutes.Normal } as RouteDescriptor,
    }),
    navIndex: {
      'dashboards/browse': {
        text: 'Dashboards',
        id: 'dashboards/browse',
        parentItem: { text: 'Home', id: HOME_NAV_ID },
      },
      [HOME_NAV_ID]: { text: 'Home', id: HOME_NAV_ID },
    },
    initPhase: DashboardInitPhase.NotStarted,
    initError: null,
    initDashboard: mockInitDashboard,
    notifyApp: mockToolkitActionCreator(notifyApp),
    cleanUpDashboardAndVariables: mockCleanUpDashboardAndVariables,
    cancelVariables: jest.fn(),
    templateVarsChangedInUrl: jest.fn(),
    dashboard: null,
    theme: createTheme(),
  };

  Object.assign(props, propOverrides);

  const context = getGrafanaContextMock();

  const { unmount, rerender } = render(
    <GrafanaContext.Provider value={context}>
      <Provider store={store}>
        <Router history={locationService.getHistory()}>
          <UnthemedDashboardPage {...props} />
        </Router>
      </Provider>
    </GrafanaContext.Provider>
  );

  const wrappedRerender = (newProps: Partial<Props>) => {
    Object.assign(props, newProps);
    return rerender(
      <GrafanaContext.Provider value={context}>
        <Provider store={store}>
          <Router history={locationService.getHistory()}>
            <UnthemedDashboardPage {...props} />
          </Router>
        </Provider>
      </GrafanaContext.Provider>
    );
  };

  return { rerender: wrappedRerender, unmount };
}

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should call initDashboard on mount', () => {
    setup();
    expect(mockInitDashboard).toBeCalledWith({
      fixUrl: true,
      routeName: 'normal-dashboard',
      urlSlug: 'my-dash',
      urlUid: '11',
      keybindingSrv: expect.anything(),
    });
  });

  describe('Given a simple dashboard', () => {
    it('Should render panels', async () => {
      setup({ dashboard: getTestDashboard() });
      expect(await screen.findByText('My panel title')).toBeInTheDocument();
    });

    it('Should update title', async () => {
      setup({ dashboard: getTestDashboard() });
      await waitFor(() => {
        expect(document.title).toBe('My dashboard - Dashboards - Grafana');
      });
    });

    it('only calls initDashboard once when wrapped in AppChrome', async () => {
      const props: Props = {
        ...getRouteComponentProps({
          match: { params: { slug: 'my-dash', uid: '11' } } as unknown as match,
          route: { routeName: DashboardRoutes.Normal } as RouteDescriptor,
        }),
        navIndex: {
          'dashboards/browse': {
            text: 'Dashboards',
            id: 'dashboards/browse',
            parentItem: { text: 'Home', id: HOME_NAV_ID },
          },
          [HOME_NAV_ID]: { text: 'Home', id: HOME_NAV_ID },
        },
        initPhase: DashboardInitPhase.Completed,
        initError: null,
        initDashboard: mockInitDashboard,
        notifyApp: mockToolkitActionCreator(notifyApp),
        cleanUpDashboardAndVariables: mockCleanUpDashboardAndVariables,
        cancelVariables: jest.fn(),
        templateVarsChangedInUrl: jest.fn(),
        dashboard: getTestDashboard(),
        theme: createTheme(),
      };

      render(
        <KBarProvider>
          <TestProvider>
            <AppChrome>
              <UnthemedDashboardPage {...props} />
            </AppChrome>
          </TestProvider>
        </KBarProvider>
      );

      await screen.findByText('My dashboard');
      expect(mockInitDashboard).toHaveBeenCalledTimes(1);
    });
  });

  describe('When going into view mode', () => {
    beforeEach(() => {
      setDataSourceSrv({
        get: jest.fn().mockResolvedValue({ getRef: jest.fn(), query: jest.fn().mockResolvedValue([]) }),
        getInstanceSettings: jest.fn().mockReturnValue({ meta: {} }),
        getList: jest.fn(),
        reload: jest.fn(),
      });
      setDashboardSrv({
        getCurrent: () => getTestDashboard(),
      } as DashboardSrv);
    });

    it('Should render panel in view mode', async () => {
      const dashboard = getTestDashboard();
      setup({
        dashboard,
        queryParams: { viewPanel: '1' },
      });
      await waitFor(() => {
        expect(dashboard.panelInView).toBeDefined();
        expect(dashboard.panels[0].isViewing).toBe(true);
      });
    });

    it('Should reset state when leaving', async () => {
      const dashboard = getTestDashboard();
      const { rerender } = setup({
        dashboard,
        queryParams: { viewPanel: '1' },
      });
      rerender({ queryParams: {}, dashboard });

      await waitFor(() => {
        expect(dashboard.panelInView).toBeUndefined();
        expect(dashboard.panels[0].isViewing).toBe(false);
      });
    });
  });

  describe('When going into edit mode', () => {
    it('Should render panel in edit mode', async () => {
      const dashboard = getTestDashboard();
      setup({
        dashboard,
        queryParams: { editPanel: '1' },
      });
      await waitFor(() => {
        expect(dashboard.panelInEdit).toBeDefined();
      });
    });
  });

  describe('When dashboard unmounts', () => {
    it('Should call close action', async () => {
      const { rerender, unmount } = setup();
      rerender({ dashboard: getTestDashboard() });
      unmount();
      await waitFor(() => {
        expect(mockCleanUpDashboardAndVariables).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('When dashboard changes', () => {
    it('Should call clean up action and init', async () => {
      const { rerender } = setup();
      rerender({ dashboard: getTestDashboard() });
      rerender({
        match: { params: { uid: 'new-uid' } } as unknown as match,
        dashboard: getTestDashboard({ title: 'Another dashboard' }),
      });
      await waitFor(() => {
        expect(mockCleanUpDashboardAndVariables).toHaveBeenCalledTimes(1);
        expect(mockInitDashboard).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('No kiosk mode tv', () => {
    it('should render dashboard page toolbar with no submenu', async () => {
      setup({
        dashboard: getTestDashboard(),
      });
      expect(await screen.findAllByTestId(selectors.pages.Dashboard.DashNav.navV2)).toHaveLength(1);
      expect(screen.queryAllByLabelText(selectors.pages.Dashboard.SubMenu.submenu)).toHaveLength(0);
    });
  });

  describe('When in full kiosk mode', () => {
    it('should not render page toolbar and submenu', async () => {
      setup({ dashboard: getTestDashboard(), queryParams: { kiosk: true } });
      await waitFor(() => {
        expect(screen.queryAllByTestId(selectors.pages.Dashboard.DashNav.navV2)).toHaveLength(0);
        expect(screen.queryAllByLabelText(selectors.pages.Dashboard.SubMenu.submenu)).toHaveLength(0);
      });
    });
  });
});
