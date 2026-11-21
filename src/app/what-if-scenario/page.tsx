import PageHeader from '@/components/PageHeader';
import ScenarioBuilder from '@/components/ScenarioBuilder';
import ScenarioResults from '@/components/ScenarioResults';

export default function WhatIfScenarioPage() {
  return (
    <div data-nexen-component="nx_app_what_if_scenario_page" className="w-full">
      <PageHeader
        title="What-If Scenario Simulation"
        subtitle="Simulate late student payments or fee delays against your cash plan without affecting stored data."
        action={null}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm">
            <ScenarioBuilder />
          </section>
          <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm">
            <ScenarioResults />
          </section>
        </div>
      </div>
    </div>
  );
}
