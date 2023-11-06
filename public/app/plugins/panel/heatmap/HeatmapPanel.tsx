import { css } from '@emotion/css';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { DataFrame, Field, getLinksSupplier, GrafanaTheme2, PanelProps, ScopedVars, TimeRange } from '@grafana/data';
import { config, PanelDataErrorView } from '@grafana/runtime';
import { ScaleDistributionConfig } from '@grafana/schema';
import {
  Portal,
  ScaleDistribution,
  TooltipPlugin2,
  ZoomPlugin,
  UPlotChart,
  usePanelContext,
  useStyles2,
  useTheme2,
  VizLayout,
  VizTooltipContainer,
} from '@grafana/ui';
import { ColorScale } from 'app/core/components/ColorScale/ColorScale';
import { readHeatmapRowsCustomMeta } from 'app/features/transformers/calculateHeatmap/heatmap';

import { ExemplarModalHeader } from './ExemplarModalHeader';
import { HeatmapHoverView } from './HeatmapHoverView';
import { prepareHeatmapData } from './fields';
import { quantizeScheme } from './palettes';
import { HeatmapTooltip } from './tooltip/HeatmapTooltip';
import { Options } from './types';
import { HeatmapHoverEvent, prepConfig } from './utils';

interface HeatmapPanelProps extends PanelProps<Options> {}

export const HeatmapPanel = ({
  data,
  id,
  timeRange,
  timeZone,
  width,
  height,
  options,
  fieldConfig,
  eventBus,
  onChangeTimeRange,
  replaceVariables,
}: HeatmapPanelProps) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const { sync, canAddAnnotations } = usePanelContext();

  const enableAnnotationCreation = Boolean(canAddAnnotations && canAddAnnotations());

  //  necessary for enabling datalinks in hover view
  let scopedVarsFromRawData: ScopedVars[] = [];
  for (const series of data.series) {
    for (const field of series.fields) {
      if (field.state?.scopedVars) {
        scopedVarsFromRawData.push(field.state.scopedVars);
      }
    }
  }

  // ugh
  let timeRangeRef = useRef<TimeRange>(timeRange);
  timeRangeRef.current = timeRange;

  const getFieldLinksSupplier = useCallback(
    (exemplars: DataFrame, field: Field) => {
      return getLinksSupplier(exemplars, field, field.state?.scopedVars ?? {}, replaceVariables);
    },
    [replaceVariables]
  );

  const palette = useMemo(() => quantizeScheme(options.color, theme), [options.color, theme]);

  const info = useMemo(() => {
    try {
      return prepareHeatmapData(
        data.series,
        data.annotations,
        options,
        palette,
        theme,
        getFieldLinksSupplier,
        replaceVariables
      );
    } catch (ex) {
      return { warning: `${ex}` };
    }
  }, [data.series, data.annotations, options, palette, theme, getFieldLinksSupplier, replaceVariables]);

  const facets = useMemo(() => {
    let exemplarsXFacet: number[] | undefined = []; // "Time" field
    let exemplarsYFacet: Array<number | undefined> = [];

    const meta = readHeatmapRowsCustomMeta(info.heatmap);
    if (info.exemplars?.length) {
      exemplarsXFacet = info.exemplars?.fields[0].values;

      // render by match on ordinal y label
      if (meta.yMatchWithLabel) {
        // ordinal/labeled heatmap-buckets?
        const hasLabeledY = meta.yOrdinalDisplay != null;

        if (hasLabeledY) {
          let matchExemplarsBy = info.exemplars?.fields.find((field) => field.name === meta.yMatchWithLabel)!.values;
          exemplarsYFacet = matchExemplarsBy.map((label) => meta.yOrdinalLabel?.indexOf(label));
        } else {
          exemplarsYFacet = info.exemplars?.fields[1].values; // "Value" field
        }
      }
      // render by raw value
      else {
        exemplarsYFacet = info.exemplars?.fields[1].values; // "Value" field
      }
    }

    return [null, info.heatmap?.fields.map((f) => f.values), [exemplarsXFacet, exemplarsYFacet]];
  }, [info.heatmap, info.exemplars]);

  const [hover, setHover] = useState<HeatmapHoverEvent | undefined>(undefined);
  const [shouldDisplayCloseButton, setShouldDisplayCloseButton] = useState<boolean>(false);
  const isToolTipOpen = useRef<boolean>(false);

  const onCloseToolTip = () => {
    isToolTipOpen.current = false;
    setShouldDisplayCloseButton(false);
    onhover(null);
  };

  const onclick = () => {
    isToolTipOpen.current = !isToolTipOpen.current;

    // Linking into useState required to re-render tooltip
    setShouldDisplayCloseButton(isToolTipOpen.current);
  };

  const onhover = useCallback(
    (evt?: HeatmapHoverEvent | null) => {
      setHover(evt ?? undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, data.structureRev]
  );

  // ugh
  const dataRef = useRef(info);
  dataRef.current = info;

  const builder = useMemo(() => {
    const scaleConfig: ScaleDistributionConfig = dataRef.current?.heatmap?.fields[1].config?.custom?.scaleDistribution;

    return prepConfig({
      dataRef,
      theme,
      eventBus,
      onhover: onhover,
      onclick: options.tooltip.show ? onclick : null,
      isToolTipOpen,
      timeZone,
      getTimeRange: () => timeRangeRef.current,
      sync,
      cellGap: options.cellGap,
      hideLE: options.filterValues?.le,
      hideGE: options.filterValues?.ge,
      exemplarColor: options.exemplars?.color ?? 'rgba(255,0,255,0.7)',
      yAxisConfig: options.yAxis,
      ySizeDivisor: scaleConfig?.type === ScaleDistribution.Log ? +(options.calculation?.yBuckets?.value || 1) : 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, timeZone, data.structureRev]);

  const renderLegend = () => {
    if (!info.heatmap || !options.legend.show) {
      return null;
    }

    return (
      <VizLayout.Legend placement="bottom" maxHeight="20%">
        <div className={styles.colorScaleWrapper}>
          <ColorScale
            // hoverValue={hoverValue}
            colorPalette={palette}
            min={dataRef.current.heatmapColors?.minValue!}
            max={dataRef.current.heatmapColors?.maxValue!}
            display={info.display}
          />
        </div>
      </VizLayout.Legend>
    );
  };

  if (info.warning || !info.heatmap) {
    return (
      <PanelDataErrorView
        panelId={id}
        fieldConfig={fieldConfig}
        data={data}
        needsNumberField={true}
        message={info.warning}
      />
    );
  }

  return (
    <>
      <VizLayout width={width} height={height} legend={renderLegend()}>
        {(vizWidth: number, vizHeight: number) => (
          <UPlotChart config={builder} data={facets as any} width={vizWidth} height={vizHeight}>
            {/*children ? children(config, alignedFrame) : null*/}
            <ZoomPlugin
              config={builder}
              onZoom={({ from, to }) => {
                onChangeTimeRange({ from, to });
              }}
            />
            {config.featureToggles.newVizTooltips && options.tooltip.show && (
              <TooltipPlugin2
                config={builder}
                render={(u, dataIdxs, seriesIdx, isPinned, dismiss) => {
                  return (
                    <HeatmapTooltip
                      dataIdxs={dataIdxs}
                      seriesIdx={seriesIdx}
                      dataRef={dataRef}
                      isPinned={isPinned}
                      dismiss={dismiss}
                      showHistogram={options.tooltip.yHistogram}
                      showColorScale={options.tooltip.showColorScale}
                      canAnnotate={enableAnnotationCreation}
                      panelData={data}
                      replaceVars={replaceVariables}
                      scopedVars={scopedVarsFromRawData}
                    />
                  );
                }}
              />
            )}
          </UPlotChart>
        )}
      </VizLayout>
      {!config.featureToggles.newVizTooltips && (
        <Portal>
          {hover && options.tooltip.show && (
            <VizTooltipContainer
              position={{ x: hover.pageX, y: hover.pageY }}
              offset={{ x: 10, y: 10 }}
              allowPointerEvents={isToolTipOpen.current}
            >
              {shouldDisplayCloseButton && <ExemplarModalHeader onClick={onCloseToolTip} />}
              <HeatmapHoverView
                timeRange={timeRange}
                data={info}
                hover={hover}
                showHistogram={options.tooltip.yHistogram}
                replaceVars={replaceVariables}
                scopedVars={scopedVarsFromRawData}
              />
            </VizTooltipContainer>
          )}
        </Portal>
      )}
    </>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  colorScaleWrapper: css({
    marginLeft: '25px',
    padding: '10px 0',
    maxWidth: '300px',
  }),
});
