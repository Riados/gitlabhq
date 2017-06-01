import PrometheusMetrics from '~/prometheus_metrics/prometheus_metrics';
import { metrics, missingVarMetrics } from './mock_data';

describe('PrometheusMetrics', () => {
  const FIXTURE = 'services/prometheus_service.html.raw';
  preloadFixtures(FIXTURE);

  beforeEach(() => {
    loadFixtures(FIXTURE);
  });

  describe('constructor', () => {
    let prometheusMetrics;

    beforeEach(() => {
      prometheusMetrics = new PrometheusMetrics('.js-prometheus-metrics-monitoring');
    });

    it('should initialize wrapper element refs on class object', () => {
      expect(prometheusMetrics.$wrapper).toBeDefined();
      expect(prometheusMetrics.$monitoredMetricsPanel).toBeDefined();
      expect(prometheusMetrics.$monitoredMetricsCount).toBeDefined();
      expect(prometheusMetrics.$monitoredMetricsLoading).toBeDefined();
      expect(prometheusMetrics.$monitoredMetricsEmpty).toBeDefined();
      expect(prometheusMetrics.$monitoredMetricsList).toBeDefined();
      expect(prometheusMetrics.$missingEnvVarPanel).toBeDefined();
      expect(prometheusMetrics.$panelToggle).toBeDefined();
      expect(prometheusMetrics.$missingEnvVarMetricCount).toBeDefined();
      expect(prometheusMetrics.$missingEnvVarMetricsList).toBeDefined();
    });

    it('should initialize metadata on class object', () => {
      expect(prometheusMetrics.backOffRequestCounter).toEqual(0);
      expect(prometheusMetrics.activeMetricsEndpoint).toContain('/test');
    });
  });

  describe('populateActiveMetrics', () => {
    let prometheusMetrics;

    beforeEach(() => {
      prometheusMetrics = new PrometheusMetrics('.js-prometheus-metrics-monitoring');
    });

    it('should show monitored metrics list', () => {
      prometheusMetrics.populateActiveMetrics(metrics);

      const $metricsListLi = prometheusMetrics.$monitoredMetricsList.find('li');

      expect(prometheusMetrics.$monitoredMetricsLoading.hasClass('hidden')).toBeTruthy();
      expect(prometheusMetrics.$monitoredMetricsList.hasClass('hidden')).toBeFalsy();

      expect(prometheusMetrics.$monitoredMetricsCount.text()).toEqual('12');
      expect($metricsListLi.length).toEqual(metrics.length);
      expect($metricsListLi.first().find('.badge-count').text()).toEqual(`${metrics[0].active_metrics}`);
    });

    it('should show missing environment variables list', () => {
      prometheusMetrics.populateActiveMetrics(missingVarMetrics);

      expect(prometheusMetrics.$monitoredMetricsLoading.hasClass('hidden')).toBeTruthy();
      expect(prometheusMetrics.$missingEnvVarPanel.hasClass('hidden')).toBeFalsy();

      expect(prometheusMetrics.$missingEnvVarMetricCount.text()).toEqual('2');
      expect(prometheusMetrics.$missingEnvVarPanel.find('li').length).toEqual(2);
      expect(prometheusMetrics.$missingEnvVarPanel.find('.flash-container')).toBeDefined();
    });
  });

  describe('loadActiveMetrics', () => {
    let prometheusMetrics;

    beforeEach(() => {
      prometheusMetrics = new PrometheusMetrics('.js-prometheus-metrics-monitoring');
    });

    it('should show loader animation while response is being loaded and hide it when request is complete', (done) => {
      const deferred = $.Deferred();
      spyOn($, 'getJSON').and.returnValue(deferred.promise());

      prometheusMetrics.loadActiveMetrics();

      expect(prometheusMetrics.$monitoredMetricsLoading.hasClass('hidden')).toBeFalsy();
      expect($.getJSON).toHaveBeenCalledWith(prometheusMetrics.activeMetricsEndpoint);

      deferred.resolve({ data: metrics, success: true });

      setTimeout(() => {
        expect(prometheusMetrics.$monitoredMetricsLoading.hasClass('hidden')).toBeTruthy();
        done();
      });
    });

    it('should show empty state if response failed to load', (done) => {
      const deferred = $.Deferred();
      spyOn($, 'getJSON').and.returnValue(deferred.promise());
      spyOn(prometheusMetrics, 'populateActiveMetrics');

      prometheusMetrics.loadActiveMetrics();

      deferred.reject();

      setTimeout(() => {
        expect(prometheusMetrics.$monitoredMetricsLoading.hasClass('hidden')).toBeTruthy();
        expect(prometheusMetrics.$monitoredMetricsEmpty.hasClass('hidden')).toBeFalsy();
        done();
      });
    });

    it('should populate metrics list once response is loaded', (done) => {
      const deferred = $.Deferred();
      spyOn($, 'getJSON').and.returnValue(deferred.promise());
      spyOn(prometheusMetrics, 'populateActiveMetrics');

      prometheusMetrics.loadActiveMetrics();

      deferred.resolve({ data: metrics, success: true });

      setTimeout(() => {
        expect(prometheusMetrics.populateActiveMetrics).toHaveBeenCalledWith(metrics);
        done();
      });
    });
  });
});
