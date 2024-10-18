import { css } from '@emotion/css';
import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';
// import { Trans } from 'app/core/internationalization'; swap with above import after adding i18nKey property to tags

import { GrafanaTheme2 } from '@grafana/data';
import {
  AdHocFiltersVariable,
  DataSourceVariable,
  SceneComponentProps,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { Box, Button, Icon, IconButton, Stack, TextLink, useStyles2 } from '@grafana/ui';
import { Text } from '@grafana/ui/src/components/Text/Text';

import { DataTrail } from './DataTrail';
import { DataTrailCard } from './DataTrailCard';
import { DataTrailsApp } from './DataTrailsApp';
// import { DataTrailsBookmarks } from './DataTrailsBookmarks';
import { RecentExplorationScene, RecentExplorationState } from './DataTrailsRecentMetrics';
import { getBookmarkKey, getTrailStore } from './TrailStore/TrailStore';
import { reportExploreMetrics } from './interactions';
import { VAR_DATASOURCE, VAR_FILTERS } from './shared';
import { getDatasourceForNewTrail, newMetricsTrail } from './utils';
import { DataTrailsBookmarks } from './DataTrailBookmarks';

export interface DataTrailsHomeState extends SceneObjectState {
  recentExplorations?: RecentExplorationScene[]; // declare the type of the state (of type RecentExplorationScene[])
}

export class DataTrailsHome extends SceneObjectBase<DataTrailsHomeState> {
  // start function class, in teh class we always need constructor to initialize the previously declared variables/types
  public constructor(state: DataTrailsHomeState) {
    // need to declare state in the constructor
    super(state);
    this._updateRecentExplorations();
    // this.addActivationHandler(this._onActivate.bind(this)); // calling the onActivate (have to use bind and pass this to it)
  }
  private _updateRecentExplorations() {
    console.log('inside _updateRecentExplorations');
    // everything in here to set up the state
    // where we make the list of recent explorations
    // say what type to type the array
    // if (this.state.recentExplorations === undefined) {
    // if it's never defined before
    const recentExplorations = getTrailStore().recent.map((trail, index) => {
      // store data into recentExplorations
      const resolvedTrail = trail.resolve();
      const state: RecentExplorationState = {
        metric: resolvedTrail.state.metric,
        createdAt: resolvedTrail.state.createdAt,
        $timeRange: resolvedTrail.state.$timeRange,
        filters: [],
        bookmarksToggle: false,
      };
      const filtersVariable = sceneGraph.lookupVariable(VAR_FILTERS, resolvedTrail); // sceneGraph is a bunch of utility methods that lets you get things from graph of scene objects that something belongs to
      // resolvedTrail is what we want to show in the box,
      if (filtersVariable instanceof AdHocFiltersVariable) {
        console.log('in filtersVariable if statement!!!');
        state.filters = filtersVariable.state.filters;
      }
      console.log('after if statement, filtersVariable: ', filtersVariable);
      const datasourceVariable = sceneGraph.lookupVariable(VAR_DATASOURCE, resolvedTrail);
      // is this object you gave me an instance of DAtaSourceVariable
      if (datasourceVariable instanceof DataSourceVariable) {
        state.datasource = datasourceVariable?.state.value.toString();
      }
      return new RecentExplorationScene(state);
    });
    this.setState({ recentExplorations });
    // }
  }

  // CB funcs we pass into components; convention for react, when doing an event CB func (event handler func? e.g., onClick, onChange, on...) which means it's a CB func we pass into a component. safe to update state in these funcs bc they're not always being called. only called when user interacts w the component
  // button: new metric exploration
  public onNewMetricsTrail = () => {
    const app = getAppFor(this);
    const trail = newMetricsTrail(getDatasourceForNewTrail());
    reportExploreMetrics('exploration_started', { cause: 'new_clicked' });
    getTrailStore().setRecentTrail(trail);
    app.goToUrlForTrail(trail);
  };

  // called when you click on a recent metric exploration card
  public onSelectRecentTrail = (trail: DataTrail) => {
    const app = getAppFor(this);
    reportExploreMetrics('exploration_started', { cause: 'recent_clicked' });
    getTrailStore().setRecentTrail(trail);
    app.goToUrlForTrail(trail);
  };

  // called when you click on a bookmark card
  public onSelectBookmark = (bookmarkIndex: number) => {
    const app = getAppFor(this);
    reportExploreMetrics('exploration_started', { cause: 'bookmark_clicked' });
    const trail = getTrailStore().getTrailForBookmarkIndex(bookmarkIndex);
    getTrailStore().setRecentTrail(trail);
    app.goToUrlForTrail(trail);
  };

  static Component = ({ model }: SceneComponentProps<DataTrailsHome>) => {
    const [_, setLastDelete] = useState(Date.now());
    const styles = useStyles2(getStyles);

    const onDelete = (index: number) => {
      getTrailStore().removeBookmark(index);
      reportExploreMetrics('bookmark_changed', { action: 'deleted' });
      setLastDelete(Date.now()); // trigger re-render
    };

    const { recentExplorations } = model.useState(); // current state list of recent explorations in scene format, we want to iterate over it with map

    const storeLastChanged = getTrailStore().lastModified;
    useEffect(() => {
      console.log('inside useEffect');
      model._updateRecentExplorations();
    }, [model, storeLastChanged]);

    // current/old code: if there are no recent trails, show metrics select page (all metrics)
    // probably need to change this logic to - if there are recent trails, show the sparklines, etc
    // If there are no recent trails, don't show home page and create a new trail
    // if (!getTrailStore().recent.length) {
    //   const trail = newMetricsTrail(getDatasourceForNewTrail());
    //   return <Redirect to={getUrlForTrail(trail)} />;
    // }
    return (
      <div className={styles.container}>
        <div className={styles.homepageBox}>
          <Stack direction="column" alignItems="center">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" width="73" height="72" viewBox="0 0 73 72" fill="none">
                <path
                  d="M65.3 8.09993C65.3 7.49993 64.7 7.19993 64.1 6.89993C52.7 3.89993 40.4 7.79993 32.9 16.7999L29 21.2999L20.9 19.1999C17.6 17.9999 14.3 19.4999 12.8 22.4999L6.49999 33.5999C6.49999 33.5999 6.49999 33.8999 6.19999 33.8999C5.89999 34.7999 6.49999 35.3999 7.39999 35.6999L17.6 37.7999C16.7 40.4999 15.8 43.1999 15.5 45.8999C15.5 46.4999 15.5 46.7999 15.8 47.0999L24.8 55.7999C25.1 56.0999 25.4 56.0999 26 56.0999C28.7 55.7999 31.7 55.1999 34.4 54.2999L36.5 64.1999C36.5 64.7999 37.4 65.3999 38 65.3999C38.3 65.3999 38.6 65.3999 38.6 65.0999L49.7 58.7999C52.4 57.2999 53.6 53.9999 53 50.9999L50.9 42.2999L55.1 38.3999C64.4 31.4999 68.3 19.4999 65.3 8.09993ZM10.1 33.2999L15.2 23.9999C16.1 22.1999 17.9 21.5999 19.7 22.1999L26.6 23.9999L23.6 27.5999C21.8 29.9999 20 32.3999 18.8 35.0999L10.1 33.2999ZM48.5 56.9999L39.2 62.3999L37.4 53.6999C40.1 52.4999 42.5 50.6999 44.9 48.8999L48.8 45.2999L50.6 52.1999C50.6 53.9999 50 56.0999 48.5 56.9999ZM53.3 36.8999L42.8 46.4999C38.3 50.3999 32.6 52.7999 26.6 53.3999L18.8 45.5999C19.7 39.5999 22.1 33.8999 26 29.3999L30.8 23.9999L31.1 23.6999L35.3 18.8999C41.9 11.0999 52.7 7.49993 62.6 9.59993C64.7 19.7999 61.4 30.2999 53.3 36.8999ZM49.7 16.7999C46.4 16.7999 44 19.4999 44 22.4999C44 25.4999 46.7 28.1999 49.7 28.1999C53 28.1999 55.4 25.4999 55.4 22.4999C55.4 19.4999 53 16.7999 49.7 16.7999ZM49.7 25.4999C48.2 25.4999 47 24.2999 47 22.7999C47 21.2999 48.2 20.0999 49.7 20.0999C51.2 20.0999 52.4 21.2999 52.4 22.7999C52.4 24.2999 51.2 25.4999 49.7 25.4999Z"
                  fill="#CCCCDC"
                  fillOpacity="0.65"
                />
              </svg>
            </div>
            <Text element="h1" textAlignment="center" weight="medium">
              {/* have to add i18nKey */}
              <Trans>Start your metrics exploration!</Trans>
            </Text>
            <Box>
              <Text element="p" textAlignment="center" color="secondary">
                {/* have to add i18nKey */}
                <Trans>Explore your Prometheus-compatible metrics without writing a query.</Trans>
                <TextLink
                  href="https://grafana.com/docs/grafana/latest/explore/explore-metrics/"
                  external
                  style={{ marginLeft: '8px' }}
                >
                  Learn more
                </TextLink>
              </Text>
            </Box>
            <div className={styles.gap24}>
              <Button size="lg" variant="primary" onClick={model.onNewMetricsTrail}>
                <div className={styles.startButton}>
                  <Trans>Let's start!</Trans>
                </div>
                <Icon name="arrow-right" size="lg" style={{ marginLeft: '8px' }} />
              </Button>
            </div>
          </Stack>
        </div>
        {getTrailStore().recent.length > 0 && (
          <>
            <div className={styles.recentExplorationHeader}>
              <div className={styles.header}>Or view a recent exploration</div>
            </div>
            <div className={css(styles.trailList, styles.bottomGap24)}>
              {getTrailStore().recent.map((trail, index) => {
                const resolvedTrail = trail.resolve();
                return (
                  <DataTrailCard
                    key={(resolvedTrail.state.key || '') + index}
                    trail={resolvedTrail}
                    onSelect={() => model.onSelectRecentTrail(resolvedTrail)}
                  />
                );
              })}
            </div>
            <Button variant="secondary" size="sm">
              Show more
            </Button>
          </>
        )}
        <DataTrailsBookmarks model={model} onDelete={onDelete} />
        {/* <div className={styles.horizontalLine} />
        <div className={css(styles.gap20, styles.bookmarkHeader)}>
          <div className={styles.header}>Or view bookmarks</div>
          <svg xmlns="http://www.w3.org/2000/svg" width="25" height="24" viewBox="0 0 25 24" fill="none">
            <path d="M17.4999 9.17019C17.3126 8.98394 17.0591 8.87939 16.7949 8.87939C16.5308 8.87939 16.2773 8.98394 16.0899 9.17019L12.4999 12.7102L8.95995 9.17019C8.77259 8.98394 8.51913 8.87939 8.25495 8.87939C7.99076 8.87939 7.73731 8.98394 7.54995 9.17019C7.45622 9.26315 7.38183 9.37375 7.33106 9.49561C7.28029 9.61747 7.25415 9.74818 7.25415 9.88019C7.25415 10.0122 7.28029 10.1429 7.33106 10.2648C7.38183 10.3866 7.45622 10.4972 7.54995 10.5902L11.7899 14.8302C11.8829 14.9239 11.9935 14.9983 12.1154 15.0491C12.2372 15.0998 12.3679 15.126 12.4999 15.126C12.632 15.126 12.7627 15.0998 12.8845 15.0491C13.0064 14.9983 13.117 14.9239 13.2099 14.8302L17.4999 10.5902C17.5937 10.4972 17.6681 10.3866 17.7188 10.2648C17.7696 10.1429 17.7957 10.0122 17.7957 9.88019C17.7957 9.74818 17.7696 9.61747 17.7188 9.49561C17.6681 9.37375 17.5937 9.26315 17.4999 9.17019Z" fill="#CCCCDC" fillOpacity="0.65" />
          </svg>
        </div>
        <div className={styles.trailList}>
          {getTrailStore().bookmarks.map((bookmark, index) => {
            return (
              <DataTrailCard
                key={getBookmarkKey(bookmark)}
                bookmark={bookmark}
                onSelect={() => model.onSelectBookmark(index)}
                onDelete={() => onDelete(index)}
              />
            );
          })}
        </div> */}
        {/* </Stack> */}
      </div>
    );
  };
}

function getAppFor(model: SceneObject) {
  return sceneGraph.getAncestor(model, DataTrailsApp);
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      height: '100%',
      boxSizing: 'border-box', // Ensure padding doesn't cause overflow
    }),
    homepageBox: css({
      backgroundColor: theme.colors.background.secondary,
      width: '725px',
      height: '294px',
      padding: '40px 32px',
      boxSizing: 'border-box', // Ensure padding doesn't cause overflow
      flexShrink: 0,
    }),
    startButton: css({
      fontWeight: theme.typography.fontWeightLight,
    }),
    header: css({
      color: 'var(--text-primary, rgba(204, 204, 220, 0.7))',
      textAlign: 'center',
      /* H4 */
      fontFamily: 'Inter',
      fontSize: '18px',
      fontStyle: 'normal',
      fontWeight: '400',
      lineHeight: '22px' /* 122.222% */,
      letterSpacing: '0.045px',
    }),
    trailList: css({
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)', // 3 columns
      gap: `${theme.spacing(3)} 31px`,
      alignItems: 'stretch', // vertically center cards in their boxes
      justifyItems: 'center',
    }),
    trailCard: css({
      boxSizing: 'border-box',
      width: '100%', // Make the card take up the full width of the grid cell
      height: 'inherit', // Make the card take up the full height of the grid cell
      backgroundColor: theme.colors.background.secondary, // Ensure the background color takes up the whole space
      borderRadius: '4px',
    }),
    recentExplorationHeader: css({
      marginTop: theme.spacing(6), // ask catherine what the number should be
      marginBottom: '20px',
    }),
    bottomGap24: css({
      marginBottom: theme.spacing(3),
    }),
    gap24: css({
      marginTop: theme.spacing(2), // Adds a 24px gap since there is already a 8px gap from the button
    }),
    bookmarkHeader: css({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing(2),
    }),
  };
}
