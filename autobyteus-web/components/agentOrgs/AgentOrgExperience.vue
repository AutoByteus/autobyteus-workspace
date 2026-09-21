<template>
  <div class="h-full overflow-auto bg-slate-50" data-test="agent-org-experience">
    <div :key="`${view}:${selectedOrg.id}`" class="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <p v-if="view === 'org-detail' && detailTopologyLoading" class="mb-4 text-sm text-slate-600" role="status">{{ t('agentOrgs.experience.detail.topologyLoading') }}</p>
      <p v-if="view === 'org-detail' && detailTopologyUnavailable" class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{{ t('agentOrgs.experience.detail.topologyUnavailable') }}</p>
      <p v-if="isAuthoringView && referencesLoading" class="mb-4 text-sm text-slate-600" role="status">{{ t('agentOrgs.experience.form.referencesLoading') }}</p>
      <p v-if="isAuthoringView && references.unavailable.length" class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{{ t('agentOrgs.experience.form.referencesUnavailable', { refs: references.unavailable.join(', ') }) }}</p>
      <template v-if="view === 'org-list'">
        <header class="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <h1 class="sr-only">{{ t('agentOrgs.experience.catalog.title') }}</h1>
          <label class="relative min-w-0 flex-1 rounded-lg border border-slate-200 bg-white shadow-sm">
            <span class="sr-only">{{ t('agentOrgs.experience.catalog.searchLabel') }}</span>
            <Icon icon="heroicons:magnifying-glass-20-solid" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input v-model="search" class="block w-full rounded-lg border-transparent bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" :placeholder="t('agentOrgs.experience.catalog.searchPlaceholder')">
          </label>
          <div class="flex items-center justify-end gap-2">
            <button
              type="button"
              class="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              :class="reloading ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'"
              :disabled="reloading"
              @click="reloadOrgs"
            >
              <Icon icon="heroicons:arrow-path-20-solid" class="mr-2 h-4 w-4" :class="{ 'animate-spin': reloading }" />
              {{ reloading ? t('agentOrgs.experience.catalog.reloading') : t('agentOrgs.experience.catalog.reload') }}
            </button>
            <button type="button" class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" data-test="create-org" @click="go('org-create')">
              {{ t('agentOrgs.experience.catalog.create') }}
            </button>
          </div>
        </header>

        <div v-if="catalogSections.length > 0" class="space-y-8">
          <section v-for="section in catalogSections" :key="section.id">
            <h2 v-if="section.title" class="mb-3 text-xl font-semibold text-slate-900">{{ section.title }}</h2>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <article v-for="org in section.orgs" :key="org.id" class="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md" :data-test="`org-card-${org.id}`">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-start">
                  <AgentOrgAvatar :name="org.name" :avatar-url="org.avatarUrl" />
                  <div class="min-w-0">
                    <h3 class="truncate text-xl font-semibold text-slate-900">{{ org.name }}</h3>
                    <p class="mt-1 line-clamp-2 text-sm text-slate-600">{{ org.description }}</p>
                  </div>
                  <div class="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                    <button type="button" class="inline-flex min-w-[104px] justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" @click="openLaunch(org.id)">{{ t('agentOrgs.experience.actions.run') }}</button>
                    <button type="button" class="inline-flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" @click="go('org-detail', org.id)">{{ t('agentOrgs.experience.actions.viewDetails') }} <span class="ml-1" aria-hidden="true">→</span></button>
                  </div>
                </div>

                <AgentOrgCatalogMemberChips :org="org" />

              </article>
            </div>
          </section>
        </div>
        <div v-else class="rounded-lg border border-slate-200 bg-white py-16 text-center shadow-sm">
          <p class="text-lg font-medium text-slate-500">{{ t('agentOrgs.experience.catalog.empty') }}</p>
          <p class="mt-2 text-sm text-slate-400">{{ t('agentOrgs.experience.catalog.emptyFiltered', { query: search.trim() }) }}</p>
        </div>
      </template>

      <template v-else-if="view === 'org-detail'">
        <button type="button" class="mb-5 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" @click="go('org-list')"><Icon icon="heroicons:arrow-left-20-solid" class="mr-2 h-4 w-4" /> {{ t('agentOrgs.experience.detail.back') }}</button>
        <header class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex min-w-0 items-start gap-4">
              <AgentOrgAvatar :name="selectedOrg.name" :avatar-url="selectedOrg.avatarUrl" />
              <div class="min-w-0"><h1 class="text-3xl font-bold tracking-tight text-slate-950">{{ selectedOrg.name }}</h1></div>
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
              <button type="button" class="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-test="run-organization" @click="openLaunch(selectedOrg.id)">{{ t('agentOrgs.experience.actions.run') }}</button>
              <button type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" @click="go('org-edit', selectedOrg.id)">{{ t('agentOrgs.experience.actions.edit') }}</button>
              <button type="button" data-test="delete-org" class="rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50" :disabled="deletePending || !selectedOrg.id" @click="requestDelete">{{ t('agentOrgs.delete.action') }}</button>
            </div>
          </div>
        </header>

        <div class="mt-4 space-y-4">
          <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 class="text-xl font-semibold text-slate-900">{{ t('agentOrgs.experience.detail.description') }}</h2>
            <p class="mt-2 text-sm leading-6 text-slate-600">{{ selectedOrg.description }}</p>
          </section>

          <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 px-5 py-4"><h2 class="text-xl font-semibold text-slate-900">{{ t('agentOrgs.experience.detail.members') }}</h2></div>
            <div class="grid divide-y divide-slate-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <div class="p-5">
                <div class="mb-4 flex items-center gap-2"><Icon icon="heroicons:user-20-solid" class="h-5 w-5 text-slate-500" /><h3 class="font-semibold text-slate-900">{{ t('agentOrgs.experience.detail.agentsCount', { count: directAgentMembers.length }) }}</h3></div>
                <ul class="space-y-3"><li v-for="agent in directAgentMembers" :key="agent.key" class="flex items-center gap-3 rounded-lg border border-slate-200 p-3"><span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{{ agent.initials }}</span><p class="min-w-0 truncate text-sm font-semibold text-slate-900">{{ agent.label }}</p></li></ul>
              </div>
              <div class="p-5">
                <div class="mb-4 flex items-center gap-2"><Icon icon="heroicons:user-group-20-solid" class="h-5 w-5 text-blue-600" /><h3 class="font-semibold text-slate-900">{{ t('agentOrgs.experience.detail.teamsCount', { count: orgTeamMembers.length }) }}</h3></div>
                <ul class="space-y-3"><li v-for="team in orgTeamMembers" :key="team.key" class="rounded-lg border border-blue-200 bg-blue-50/50 p-3"><div class="flex items-center gap-3"><span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-700"><Icon icon="heroicons:user-group-20-solid" class="h-5 w-5" /></span><div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold text-slate-900">{{ team.label }}</p><p v-if="team.coordinatorLabel" class="truncate text-xs text-slate-500">{{ t('agentOrgs.experience.member.coordinator', { name: team.coordinatorLabel }) }}</p></div><button type="button" class="text-xs font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" @click="openTeam(team.ref)">{{ t('agentOrgs.experience.actions.view') }}</button></div></li></ul>
              </div>
            </div>
          </section>

          <div v-show="!detailTopologyLoading && !detailTopologyUnavailable"><HandoffManager :model-value="detailOrgHandoffs" :from-options="detailOrgHandoffOptions.from" :to-options="detailOrgHandoffOptions.to" mode="view" scope="org" /></div>
        </div>
      </template>

      <template v-else>
        <button type="button" class="mb-5 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" @click="go('org-list')"><Icon icon="heroicons:arrow-left-20-solid" class="mr-2 h-4 w-4" /> {{ t('agentOrgs.experience.detail.back') }}</button>
        <header class="mb-6"><h1 class="text-3xl font-bold tracking-tight text-slate-950">{{ view === 'org-create' ? t('agentOrgs.experience.catalog.create') : t('agentOrgs.experience.form.editTitle', { name: selectedOrg.name }) }}</h1><p class="mt-2 max-w-3xl text-base text-slate-600">{{ t('agentOrgs.experience.form.description') }}</p></header>
        <form class="space-y-4" @submit.prevent="saveOrg">
          <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <AgentOrgAvatarEditor :key="`${view}:${selectedOrg.id}`" v-model="formAvatarUrl" :name="formName" :disabled="saving" @pending="avatarPending = $event" />
          </section>
          <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 class="font-semibold text-slate-900">{{ t('agentOrgs.experience.form.basics') }}</h2><div class="mt-4 space-y-4"><label class="block"><span class="text-sm font-medium text-slate-700">{{ t('agentOrgs.experience.form.name') }}</span><input v-model="formName" required class="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"></label><label class="block"><span class="text-sm font-medium text-slate-700">{{ t('agentOrgs.experience.detail.description') }}</span><textarea v-model="formDescription" rows="3" class="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"></textarea></label></div></section>

          <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <h2 class="text-xl font-semibold text-slate-900">{{ t('agentOrgs.experience.detail.members') }}</h2>
              <button type="button" class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-test="open-member-picker" @click="memberPickerOpen ? closeMemberPicker() : openMemberPicker()">
                <Icon :icon="memberPickerOpen ? 'heroicons:x-mark-20-solid' : 'heroicons:plus-20-solid'" class="h-4 w-4" /> {{ memberPickerOpen ? t('agentOrgs.experience.form.close') : t('agentOrgs.experience.form.addMember') }}
              </button>
            </div>
            <section v-if="memberPickerOpen" class="border-b border-slate-200 bg-slate-50 px-5 py-5" data-test="org-member-picker" aria-labelledby="member-picker-title">
              <div class="flex items-start justify-between gap-4"><div><h3 id="member-picker-title" class="font-semibold text-slate-900">{{ t('agentOrgs.experience.form.chooseMembers') }}</h3><p class="mt-1 text-sm text-slate-600">{{ t('agentOrgs.experience.form.chooseMembersHelp') }}</p></div></div>
              <label class="relative mt-4 block"><span class="sr-only">{{ t('agentOrgs.experience.form.searchMembers') }}</span><Icon icon="heroicons:magnifying-glass-20-solid" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input v-model="memberSearch" type="search" class="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" :placeholder="t('agentOrgs.experience.form.searchMembers')"></label>
              <div class="mt-4 flex gap-1 border-b border-slate-200" role="tablist" :aria-label="t('agentOrgs.experience.form.memberType')">
                <button type="button" role="tab" class="border-b-2 px-4 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :class="memberPickerTab === 'agents' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'" :aria-selected="memberPickerTab === 'agents'" @click="memberPickerTab = 'agents'">{{ t('agentOrgs.experience.form.agents') }}</button>
                <button type="button" role="tab" class="border-b-2 px-4 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :class="memberPickerTab === 'teams' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'" :aria-selected="memberPickerTab === 'teams'" @click="memberPickerTab = 'teams'">{{ t('agentOrgs.experience.form.teams') }}</button>
              </div>
              <ul v-if="memberPickerTab === 'agents'" class="mt-4 grid gap-2 lg:grid-cols-2" data-test="member-picker-agents">
                <li v-for="agent in filteredMemberAgents" :key="agent.id" class="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
                  <span class="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{{ agent.initials }}</span>
                  <div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold text-slate-900">{{ agent.name }}</p><p class="truncate text-xs text-slate-500">{{ agent.description }}</p></div>
                  <button type="button" class="rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :class="formAgentIds.includes(agent.id) ? 'cursor-default bg-slate-100 text-slate-500' : 'border border-blue-200 bg-white text-blue-700 hover:bg-blue-50'" :disabled="formAgentIds.includes(agent.id)" :aria-label="formAgentIds.includes(agent.id) ? t('agentOrgs.experience.form.memberAddedLabel', { name: agent.name }) : t('agentOrgs.experience.form.addMemberLabel', { name: agent.name })" @click="addOrgAgent(agent.id)">{{ formAgentIds.includes(agent.id) ? t('agentOrgs.experience.actions.added') : t('agentOrgs.experience.actions.add') }}</button>
                </li>
                <li v-if="filteredMemberAgents.length === 0" class="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 lg:col-span-2">{{ t('agentOrgs.experience.form.noAgentMatches') }}</li>
              </ul>
              <ul v-else class="mt-4 grid gap-2 lg:grid-cols-2" data-test="member-picker-teams">
                <li v-for="team in filteredMemberTeams" :key="team.id" class="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
                  <span class="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon icon="heroicons:user-group-20-solid" class="h-5 w-5" /></span>
                  <div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold text-slate-900">{{ team.name }}</p><p class="truncate text-xs text-slate-500">{{ t('agentOrgs.experience.member.coordinator', { name: agentById(team.coordinatorId).name }) }}</p></div>
                  <button type="button" class="rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :class="formTeamIds.includes(team.id) ? 'cursor-default bg-slate-100 text-slate-500' : 'border border-blue-200 bg-white text-blue-700 hover:bg-blue-50'" :disabled="formTeamIds.includes(team.id)" :aria-label="formTeamIds.includes(team.id) ? t('agentOrgs.experience.form.memberAddedLabel', { name: team.name }) : t('agentOrgs.experience.form.addMemberLabel', { name: team.name })" @click="addOrgTeam(team.id)">{{ formTeamIds.includes(team.id) ? t('agentOrgs.experience.actions.added') : t('agentOrgs.experience.actions.add') }}</button>
                </li>
                <li v-if="filteredMemberTeams.length === 0" class="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 lg:col-span-2">{{ t('agentOrgs.experience.form.noTeamMatches') }}</li>
              </ul>
              <div class="mt-4 flex justify-end"><button type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" @click="closeMemberPicker">{{ t('agentOrgs.experience.actions.done') }}</button></div>
            </section>
            <div class="grid lg:grid-cols-2 lg:divide-x lg:divide-slate-100">
              <div class="p-5"><h3 class="font-semibold text-slate-900">{{ t('agentOrgs.experience.form.agents') }}</h3><ul v-if="formAgentIds.length" class="mt-4 space-y-2"><li v-for="agentId in formAgentIds" :key="agentId" class="flex items-center gap-3 rounded-lg border border-slate-200 p-3"><span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{{ agentById(agentId).initials }}</span><p class="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{{ agentById(agentId).name }}</p><button type="button" class="rounded text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :aria-label="t('agentOrgs.experience.form.removeMemberLabel', { name: agentById(agentId).name })" @click="removeOrgAgent(agentId)"><Icon icon="heroicons:x-mark-20-solid" class="h-4 w-4" /></button></li></ul><p v-else class="mt-4 text-sm text-slate-500">{{ t('agentOrgs.experience.form.noAgents') }}</p></div>
              <div class="p-5"><h3 class="font-semibold text-slate-900">{{ t('agentOrgs.experience.form.teams') }}</h3><ul v-if="formTeamIds.length" class="mt-4 space-y-2"><li v-for="teamId in formTeamIds" :key="teamId" class="rounded-lg border border-blue-200 bg-blue-50/50 p-3"><div class="flex items-center gap-3"><span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-700"><Icon icon="heroicons:user-group-20-solid" class="h-4 w-4" /></span><div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold text-slate-900">{{ teamById(teamId).name }}</p><p class="truncate text-xs text-slate-500">{{ t('agentOrgs.experience.member.coordinator', { name: agentById(teamById(teamId).coordinatorId).name }) }}</p></div><button type="button" class="rounded text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :aria-label="t('agentOrgs.experience.form.removeMemberLabel', { name: teamById(teamId).name })" @click="removeOrgTeam(teamId)"><Icon icon="heroicons:x-mark-20-solid" class="h-4 w-4" /></button></div></li></ul><p v-else class="mt-4 text-sm text-slate-500">{{ t('agentOrgs.experience.form.noTeams') }}</p></div>
            </div>
          </section>

          <div v-show="!referencesLoading"><HandoffManager ref="orgHandoffManager" v-model="formOrgHandoffs" :from-options="formOrgHandoffOptions.from" :to-options="formOrgHandoffOptions.to" mode="edit" scope="org" /></div>
          <section v-if="saveError" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">{{ saveError }}</section>
          <section v-if="saved" class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">{{ t('agentOrgs.experience.form.saved') }}</section>
          <div class="flex justify-end gap-3"><button type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" @click="go('org-list')">{{ t('agentOrgs.experience.actions.cancel') }}</button><button type="submit" :disabled="saving || avatarPending || referencesLoading || references.unavailable.length > 0" class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{{ view === 'org-create' ? t('agentOrgs.experience.actions.createOrg') : t('agentOrgs.experience.actions.saveChanges') }}</button></div>
        </form>
      </template>
    </div>
    <p v-if="deleteNotice" class="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{{ deleteNotice }}</p>
    <ConfirmationModal :show="Boolean(deleteTarget)" :title="t('agentOrgs.delete.title')" :confirm-button-text="deletePending ? t('agentOrgs.delete.pending') : t('agentOrgs.delete.action')" variant="danger" :pending="deletePending" @cancel="cancelDelete" @confirm="confirmDelete">
      <p class="text-sm text-slate-700">{{ t('agentOrgs.delete.confirm', { name: deleteTarget?.name || '' }) }}</p>
      <p class="mt-3 text-sm text-slate-600">{{ t('agentOrgs.delete.scope') }}</p>
      <p v-if="deleteError" class="mt-3 text-sm text-red-700" role="alert">{{ deleteError }}</p>
    </ConfirmationModal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import AgentOrgCatalogMemberChips from './AgentOrgCatalogMemberChips.vue'
import AgentOrgAvatar from './AgentOrgAvatar.vue'
import AgentOrgAvatarEditor from './AgentOrgAvatarEditor.vue'
import ConfirmationModal from '~/components/common/ConfirmationModal.vue'
import { useRoute, useRouter } from 'vue-router'
import HandoffManager from '~/components/collaboration/handoffs/HandoffManager.vue'
import { buildTeamLocalAgentDefinitionId } from '~/utils/teamLocalDefinitionId'
import { loadAgentOrgDefinitionReferences, type AgentOrgDefinitionReferences } from '~/services/agentOrgDefinition/agentOrgDefinitionReferences'
import {
  loadAgentOrgEndpointCatalog,
  type AgentOrgEndpointCatalog,
  type AgentOrgEndpointCatalogItem,
} from '~/services/agentOrgDefinition/agentOrgEndpointCatalog'
import { useLocalization } from '~/composables/useLocalization'
import { useAgentDefinitionStore, type AgentDefinition } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { formatMemberRoleLabel } from '~/utils/collaboration/memberRoleLabel'
import {
  useAgentOrgDefinitionStore,
  type AgentOrgDefinition,
  type AgentOrgDefinitionDraft,
  type AgentOrgMember,
} from '~/stores/agentOrgDefinitionStore'
import {
  toDefinitionHandoffs,
  toEditableHandoffs,
  type EditableHandoff,
  type HandoffEndpointOption,
} from '~/types/collaboration/handoffs'

type OrgView = 'org-list' | 'org-detail' | 'org-create' | 'org-edit'
type HandoffManagerExpose = { validateAll: () => boolean; clearStatus: () => void }
type AgentView = { id: string; name: string; description: string; initials: string }
type TeamView = { id: string; name: string; description: string; coordinatorId: string }

const route = useRoute()
const router = useRouter()
const { t } = useLocalization()
const orgStore = useAgentOrgDefinitionStore()
const agentStore = useAgentDefinitionStore()
const teamStore = useAgentTeamDefinitionStore()
const windowContext = useWindowNodeContextStore()
const search = ref('')
const reloading = ref(false)
const saved = ref(false)
const saveError = ref('')
const saving = ref(false)
const orgHandoffManager = ref<HandoffManagerExpose | null>(null)
const memberPickerOpen = ref(false)
const memberPickerTab = ref<'agents' | 'teams'>('agents')
const memberSearch = ref('')
const formName = ref('')
const formDescription = ref('')
const formAvatarUrl = ref('')
const initialAvatarUrl = ref('')
const avatarPending = ref(false)
let formGeneration = 0
const deleteTarget = ref<{ id: string; name: string } | null>(null)
const deletePending = ref(false)
const deleteError = ref('')
const deleteNotice = ref('')
onBeforeUnmount(() => { formGeneration += 1; deleteTarget.value = null })
const formMembers = ref<AgentOrgMember[]>([])
const formOrgHandoffs = ref<EditableHandoff[]>([])
const references = ref<AgentOrgDefinitionReferences>({ agents: {}, teams: {}, unavailable: [] })
const referencesLoading = ref(false)
const detailTopology = ref<AgentOrgEndpointCatalog>({ from: [], to: [] })
const detailTopologyLoading = ref(false)
const detailTopologyUnavailable = ref(false)

const emptyOrg: AgentOrgDefinition = {
  id: '', name: '', description: '', instructions: '', revision: '', members: [], handoffs: [],
}
const view = computed<OrgView>(() => {
  const candidate = String(route.query.view || 'org-list') as OrgView
  return ['org-list', 'org-detail', 'org-create', 'org-edit'].includes(candidate) ? candidate : 'org-list'
})
const isAuthoringView = computed(() => view.value === 'org-create' || view.value === 'org-edit')
const selectedOrg = computed(() => orgStore.byId(String(route.query.id || '')) ?? emptyOrg)
const orgInitials = (name: string): string => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'AO'
const memberRoleLabel = (member: AgentOrgMember): string => formatMemberRoleLabel(member.memberName)
  || t(member.refType === 'AGENT_TEAM' ? 'agentOrgs.experience.member.teamFallback' : 'agentOrgs.experience.member.agentFallback')
const toAgentView = (definition: Pick<AgentDefinition, 'id' | 'name' | 'description'> | null | undefined, fallbackId: string): AgentView => {
  const name = definition?.name || fallbackId
  return { id: definition?.id || fallbackId, name, description: definition?.description || '', initials: orgInitials(name) }
}
const agentById = (id: string): AgentView => toAgentView(references.value.agents[id] ?? agentStore.getAgentDefinitionById(id), id)
const teamById = (id: string): TeamView => {
  const team = references.value.teams[id] ?? teamStore.getCatalogAgentTeamDefinitionById(id)
  if (!team) return { id, name: id, description: '', coordinatorId: '' }
  const coordinator = team.nodes.find((member) => member.memberName === team.coordinatorMemberName)
  return { id: team.id, name: team.name, description: team.description, coordinatorId: coordinator?.refScope === 'TEAM_LOCAL' ? buildTeamLocalAgentDefinitionId(team.id, coordinator.ref) : coordinator?.ref || team.coordinatorMemberName }
}
const catalogOrgs = computed(() => orgStore.definitions)
const filteredOrgs = computed(() => {
  const query = search.value.trim().toLowerCase()
  return query ? catalogOrgs.value.filter((org) => `${org.name} ${org.description}`.toLowerCase().includes(query)) : catalogOrgs.value
})
const catalogSections = computed(() => {
  if (search.value.trim()) return filteredOrgs.value.length ? [{ id: 'search', title: '', orgs: filteredOrgs.value }] : []
  return catalogOrgs.value.length ? [{ id: 'featured', title: t('agentOrgs.experience.catalog.featured'), orgs: catalogOrgs.value }] : []
})
const directAgentMembers = computed(() => selectedOrg.value.members.filter((member) => member.refType === 'AGENT').map((member) => {
  const label = memberRoleLabel(member)
  return { key: `${member.memberName}:${member.ref}`, ref: member.ref, label, initials: orgInitials(label) }
}))
const orgTeamMembers = computed(() => selectedOrg.value.members.filter((member) => member.refType === 'AGENT_TEAM').map((member) => {
  const address = `/${member.memberName}`
  const endpoint = detailTopology.value.to.find((item) => item.kind === 'agent_team'
    && item.address === address && item.definitionId === member.ref)
  return {
    key: `${member.memberName}:${member.ref}`,
    ref: member.ref,
    label: memberRoleLabel(member),
    coordinatorLabel: endpoint?.coordinatorMemberName ? formatMemberRoleLabel(endpoint.coordinatorMemberName) : '',
  }
}))
const availableAgents = computed(() => agentStore.sharedAgentDefinitions.map((agent) => toAgentView(agent, agent.id)))
const availableTeams = computed(() => teamStore.sharedAgentTeamDefinitions.map((team) => teamById(team.id)))
const formAgentIds = computed(() => formMembers.value.filter((member) => member.refType === 'AGENT').map((member) => member.ref))
const formTeamIds = computed(() => formMembers.value.filter((member) => member.refType === 'AGENT_TEAM').map((member) => member.ref))
const normalizedMemberSearch = computed(() => memberSearch.value.trim().toLowerCase())
const filteredMemberAgents = computed(() => availableAgents.value.filter((agent) => !normalizedMemberSearch.value || `${agent.name} ${agent.description}`.toLowerCase().includes(normalizedMemberSearch.value)))
const filteredMemberTeams = computed(() => availableTeams.value.filter((team) => !normalizedMemberSearch.value || `${team.name} ${team.description} ${agentById(team.coordinatorId).name}`.toLowerCase().includes(normalizedMemberSearch.value)))

const uniqueMemberName = (raw: string): string => {
  const stem = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'member'
  let candidate = stem
  for (let suffix = 2; formMembers.value.some((member) => member.memberName.toLowerCase() === candidate.toLowerCase()); suffix += 1) candidate = `${stem}_${suffix}`
  return candidate
}
const buildFormHandoffOptions = (members: readonly AgentOrgMember[]) => {
  const from: HandoffEndpointOption[] = []
  const to: HandoffEndpointOption[] = []
  for (const member of members) {
    if (member.refType === 'AGENT') {
      const option = { id: member.memberName, kind: 'agent' as const, label: agentById(member.ref).name, address: `/${member.memberName}`, group: t('agentOrgs.experience.form.directAgentsGroup') }
      from.push(option); to.push(option); continue
    }
    const team = references.value.teams[member.ref] ?? teamStore.getCatalogAgentTeamDefinitionById(member.ref)
    if (!team) continue
    const teamAddress = `/${member.memberName}`
    const teamOption = { id: member.memberName, kind: 'team' as const, label: team.name, address: teamAddress, group: t('agentOrgs.experience.form.teamsGroup'), coordinatorAddress: `${teamAddress}/${team.coordinatorMemberName}` }
    to.push(teamOption)
    for (const agent of team.nodes) {
      const option = { id: `${member.memberName}/${agent.memberName}`, kind: 'agent' as const, label: `${team.name} / ${agent.memberName}`, address: `${teamAddress}/${agent.memberName}`, group: t('agentOrgs.experience.form.teamGroup', { name: team.name }) }
      from.push(option); to.push(option)
    }
  }
  return { from, to }
}
const directRoleHandoffOptions = (members: readonly AgentOrgMember[]) => {
  const options = members.filter((member) => member.refType === 'AGENT').map((member): HandoffEndpointOption => ({
    id: member.memberName, kind: 'agent', label: memberRoleLabel(member), address: `/${member.memberName}`,
    group: t('agentOrgs.experience.form.directAgentsGroup'),
  }))
  return { from: options, to: options }
}
const toDetailEndpointOption = (
  endpoint: AgentOrgEndpointCatalogItem, members: readonly AgentOrgMember[],
): HandoffEndpointOption | null => {
  const directMember = members.find((member) => `/${member.memberName}` === endpoint.address)
  if (directMember) {
    const expectedKind = directMember.refType === 'AGENT' ? 'agent' : 'agent_team'
    if (endpoint.kind !== expectedKind || endpoint.definitionId !== directMember.ref) return null
    return {
      id: endpoint.address, kind: endpoint.kind === 'agent_team' ? 'team' : 'agent', label: memberRoleLabel(directMember),
      address: endpoint.address, group: t(endpoint.kind === 'agent_team' ? 'agentOrgs.experience.form.teamsGroup' : 'agentOrgs.experience.form.directAgentsGroup'),
      ...(endpoint.coordinatorAddress ? { coordinatorAddress: endpoint.coordinatorAddress } : {}),
    }
  }
  const teamMember = members.find((member) => member.refType === 'AGENT_TEAM'
    && endpoint.address.startsWith(`/${member.memberName}/`))
  if (!teamMember || endpoint.kind !== 'agent') return null
  const teamLabel = memberRoleLabel(teamMember)
  const nestedLabel = formatMemberRoleLabel(endpoint.memberName) || t('agentOrgs.experience.member.agentFallback')
  return {
    id: endpoint.address, kind: 'agent', label: `${teamLabel} / ${nestedLabel}`, address: endpoint.address,
    group: t('agentOrgs.experience.form.teamGroup', { name: teamLabel }),
  }
}
const endpointCatalogCoversDetail = (catalog: AgentOrgEndpointCatalog, members: readonly AgentOrgMember[]): boolean => members.every((member) => {
  const address = `/${member.memberName}`
  const kind = member.refType === 'AGENT' ? 'agent' : 'agent_team'
  const destinations = catalog.to.filter((item) => item.address === address && item.kind === kind && item.definitionId === member.ref)
  if (destinations.length !== 1) return false
  if (member.refType === 'AGENT') return catalog.from.some((item) => item.address === address && item.kind === 'agent' && item.definitionId === member.ref)
  const coordinatorAddress = destinations[0]?.coordinatorAddress
  return Boolean(coordinatorAddress
    && catalog.from.some((item) => item.kind === 'agent' && item.address === coordinatorAddress)
    && catalog.to.some((item) => item.kind === 'agent' && item.address === coordinatorAddress))
})
const detailOrgHandoffOptions = computed(() => {
  const members = selectedOrg.value.members
  if (!members.some((member) => member.refType === 'AGENT_TEAM')) return directRoleHandoffOptions(members)
  const map = (endpoint: AgentOrgEndpointCatalogItem) => toDetailEndpointOption(endpoint, members)
  return {
    from: detailTopology.value.from.map(map).filter((option): option is HandoffEndpointOption => Boolean(option)),
    to: detailTopology.value.to.map(map).filter((option): option is HandoffEndpointOption => Boolean(option)),
  }
})
const detailOrgHandoffs = computed(() => toEditableHandoffs(selectedOrg.value.handoffs))
const formOrgHandoffOptions = computed(() => buildFormHandoffOptions(formMembers.value))

const hydrateForm = (): void => {
  const org = selectedOrg.value
  formGeneration += 1
  formAvatarUrl.value = view.value === 'org-create' ? '' : org.avatarUrl || ''
  initialAvatarUrl.value = formAvatarUrl.value
  avatarPending.value = false
  formName.value = view.value === 'org-create' ? '' : org.name
  formDescription.value = view.value === 'org-create' ? '' : org.description
  formMembers.value = view.value === 'org-create' ? [] : org.members.map((member) => ({ ...member }))
  formOrgHandoffs.value = view.value === 'org-create' ? [] : toEditableHandoffs(org.handoffs)
  saved.value = false; saveError.value = ''; memberPickerOpen.value = false; memberPickerTab.value = 'agents'; memberSearch.value = ''
}
watch([view, () => route.query.id, () => selectedOrg.value.id], hydrateForm, { immediate: true })
watch(() => JSON.stringify([
  view.value, selectedOrg.value.id, selectedOrg.value.revision, formMembers.value, windowContext.bindingRevision,
]), async (_, __, onCleanup) => {
  let current = true
  onCleanup(() => { current = false })
  references.value = { agents: {}, teams: {}, unavailable: [] }
  referencesLoading.value = false
  if (!isAuthoringView.value) return
  referencesLoading.value = true
  const resolved = await loadAgentOrgDefinitionReferences(selectedOrg.value.id, formMembers.value, {
    getCatalogAgentById: agentStore.getAgentDefinitionById, getCatalogTeamById: teamStore.getCatalogAgentTeamDefinitionById,
  })
  if (!current) return
  references.value = resolved
  referencesLoading.value = false
}, { immediate: true })
watch(() => JSON.stringify([
  view.value, selectedOrg.value.id, selectedOrg.value.revision, windowContext.bindingRevision,
  selectedOrg.value.members.filter((member) => member.refType === 'AGENT_TEAM')
    .map(({ memberName, ref, refScope }) => [memberName, ref, refScope]),
]), async (_, __, onCleanup) => {
  let current = true
  onCleanup(() => { current = false })
  detailTopology.value = { from: [], to: [] }
  detailTopologyLoading.value = false
  detailTopologyUnavailable.value = false
  const members = selectedOrg.value.members
  if (view.value !== 'org-detail' || !selectedOrg.value.id || !members.some((member) => member.refType === 'AGENT_TEAM')) return
  detailTopologyLoading.value = true
  try {
    const catalog = await loadAgentOrgEndpointCatalog(selectedOrg.value.id)
    if (!endpointCatalogCoversDetail(catalog, members)) throw new Error('Incomplete Agent Org endpoint catalog response.')
    if (!current) return
    detailTopology.value = catalog
  } catch {
    if (!current) return
    detailTopologyUnavailable.value = true
  } finally {
    if (current) detailTopologyLoading.value = false
  }
}, { immediate: true })
watch(isAuthoringView, (authoring) => {
  if (authoring) void Promise.allSettled([agentStore.fetchAllAgentDefinitions(), teamStore.fetchAllAgentTeamDefinitions()])
}, { immediate: true })
const go = (nextView: OrgView, id?: string) => router.push({ path: '/agent-orgs', query: { view: nextView, ...(id ? { id } : {}) } })
watch([view, () => route.query.id], () => { deleteTarget.value = null; deleteError.value = ''; deleteNotice.value = '' }, { flush: 'sync' })
const requestDelete = () => {
  if (deletePending.value || !selectedOrg.value.id) return
  deleteTarget.value = { id: selectedOrg.value.id, name: selectedOrg.value.name }
  deleteError.value = ''; deleteNotice.value = ''
}
const cancelDelete = () => { if (!deletePending.value) deleteTarget.value = null }
const confirmDelete = async () => {
  const target = deleteTarget.value
  if (!target || deletePending.value) return
  deletePending.value = true; deleteError.value = ''
  try {
    const deleted = await orgStore.remove(target.id)
    if (deleteTarget.value !== target) return
    if (!deleted) { deleteError.value = t('agentOrgs.delete.failed'); return }
    deleteTarget.value = null
    // The mutation has committed. Navigation failure must never offer another deletion.
    const reportNavigationFailure = () => {
      if (view.value === 'org-detail' && String(route.query.id) === target.id) deleteNotice.value = t('agentOrgs.delete.navigationFailed')
    }
    try { if (await go('org-list')) reportNavigationFailure() } catch { reportNavigationFailure() }
  } catch (cause) {
    if (deleteTarget.value === target) deleteError.value = cause instanceof Error ? cause.message : String(cause)
  } finally { deletePending.value = false }
}
const openTeam = (id: string) => router.push({ path: '/agent-teams', query: { view: 'team-detail', id, returnToOrg: selectedOrg.value.id } })
const openLaunch = (id: string) => router.push({ path: '/workspace', query: { rootSubjectKind: 'agent_org', definitionId: id, mode: 'configuration' } })
const reloadOrgs = async (): Promise<void> => { reloading.value = true; try { await orgStore.fetchAll(true) } finally { reloading.value = false } }
const openMemberPicker = (): void => { memberPickerTab.value = 'agents'; memberSearch.value = ''; memberPickerOpen.value = true }
const closeMemberPicker = (): void => { memberPickerOpen.value = false; memberSearch.value = '' }
const addMember = (ref: string, refType: AgentOrgMember['refType'], displayName: string): void => {
  if (formMembers.value.some((member) => member.ref === ref && member.refType === refType)) return
  formMembers.value.push({ memberName: uniqueMemberName(displayName), ref, refType, refScope: 'SHARED' })
  saved.value = false
}
const addOrgAgent = (id: string) => addMember(id, 'AGENT', agentById(id).name)
const addOrgTeam = (id: string) => addMember(id, 'AGENT_TEAM', teamById(id).name)
const removeMember = (ref: string, refType: AgentOrgMember['refType']): void => { formMembers.value = formMembers.value.filter((member) => member.ref !== ref || member.refType !== refType); saved.value = false }
const removeOrgAgent = (id: string) => removeMember(id, 'AGENT')
const removeOrgTeam = (id: string) => removeMember(id, 'AGENT_TEAM')
const saveOrg = async (): Promise<void> => {
  if (saving.value || avatarPending.value || referencesLoading.value || references.value.unavailable.length) return
  if (!formName.value.trim()) { saveError.value = t('agentOrgs.experience.form.nameRequired'); return }
  if (!orgHandoffManager.value?.validateAll()) { saveError.value = t('agentOrgs.experience.form.handoffsInvalid'); return }
  const generation = formGeneration
  const editedOrg = selectedOrg.value
  const creating = view.value === 'org-create'
  saving.value = true; saved.value = false; saveError.value = ''
  const visibleInput = {
    name: formName.value.trim(),
    description: formDescription.value.trim(),
    members: formMembers.value.map((member) => ({ ...member })),
    handoffs: toDefinitionHandoffs(formOrgHandoffs.value),
  }
  try {
    if (creating) {
      const createInput: AgentOrgDefinitionDraft = {
        ...visibleInput,
        instructions: '',
        category: null,
        avatarUrl: formAvatarUrl.value || null,
        defaultLaunchConfig: null,
      }
      const created = await orgStore.create(createInput)
      if (generation !== formGeneration) return
      await go('org-edit', created.id)
      if (String(view.value) !== 'org-edit' || String(route.query.id) !== created.id) return
    } else {
      const updated = await orgStore.update(editedOrg.id, editedOrg.revision, {
        ...visibleInput,
        ...(formAvatarUrl.value !== initialAvatarUrl.value ? { avatarUrl: formAvatarUrl.value } : {}),
      })
      if (generation !== formGeneration) return
      initialAvatarUrl.value = updated.avatarUrl || ''
      formAvatarUrl.value = initialAvatarUrl.value
    }
    await nextTick(); orgHandoffManager.value?.clearStatus(); saved.value = true
  } catch (error) { if (generation === formGeneration) saveError.value = error instanceof Error ? error.message : String(error) } finally { saving.value = false }
}
onMounted(async () => {
  await Promise.allSettled([orgStore.fetchAll()])
})
</script>
