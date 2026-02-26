import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import type { AgentTeamDefinition } from './agentTeamDefinitionStore';
import type { ApplicationLaunchProfile } from '~/types/application/ApplicationLaunchProfile';
import { useApplicationContextStore } from './applicationContextStore';

interface ApplicationLaunchProfileState {
  profiles: Record<string, ApplicationLaunchProfile>;
}

export const APPLICATION_LAUNCH_PROFILE_STORAGE_KEY = 'autobyteus-application-launch-profiles';

export const useApplicationLaunchProfileStore = defineStore('applicationLaunchProfile', {
  state: (): ApplicationLaunchProfileState => ({
    profiles: {},
  }),

  actions: {
    loadLaunchProfiles() {
      try {
        if (typeof window === 'undefined') return;
        const storedProfiles = localStorage.getItem(APPLICATION_LAUNCH_PROFILE_STORAGE_KEY);
        if (storedProfiles) {
          const parsedProfiles = JSON.parse(storedProfiles);
          const validProfiles: Record<string, ApplicationLaunchProfile> = {};
          
          // Filter out old-format profiles to ensure only valid ones are loaded.
          for (const key in parsedProfiles) {
            const profile = parsedProfiles[key];
            if (profile && typeof profile.globalLlmModelIdentifier === 'string') {
              validProfiles[key] = profile;
            }
          }
          this.profiles = validProfiles;
        }
      } catch (error) {
        console.error("Failed to load application launch profiles from localStorage", error);
        this.profiles = {};
      }
    },

    saveLaunchProfiles() {
      try {
        if (typeof window === 'undefined') return;
        localStorage.setItem(APPLICATION_LAUNCH_PROFILE_STORAGE_KEY, JSON.stringify(this.profiles));
      } catch (error) {
        console.error("Failed to save application launch profiles to localStorage", error);
      }
    },

    createLaunchProfile(
      appId: string,
      teamDefinition: AgentTeamDefinition,
      launchConfig: {
        name: string;
        globalLlmModelIdentifier: string;
        memberLlmConfigOverrides: Record<string, string>;
      }
    ): ApplicationLaunchProfile {
      const profileId = uuidv4();
      const newProfile: ApplicationLaunchProfile = {
        id: profileId,
        name: launchConfig.name,
        createdAt: new Date().toISOString(),
        appId: appId,
        teamDefinition: JSON.parse(JSON.stringify(teamDefinition)), // Deep copy snapshot
        globalLlmModelIdentifier: launchConfig.globalLlmModelIdentifier,
        memberLlmConfigOverrides: JSON.parse(JSON.stringify(launchConfig.memberLlmConfigOverrides)),
      };

      this.profiles[profileId] = newProfile;
      this.saveLaunchProfiles();
      return newProfile;
    },
    
    deleteLaunchProfile(profileId: string) {
      if (this.profiles[profileId]) {
        delete this.profiles[profileId];
        this.saveLaunchProfiles();
      }
    },
  },
  
  getters: {
    allLaunchProfiles(state): ApplicationLaunchProfile[] {
      return Object.values(state.profiles).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    
    getProfilesForApp: (state) => (appId: string): ApplicationLaunchProfile[] => {
      return Object.values(state.profiles)
        .filter(p => p.appId === appId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    _runningProfileIds(): Set<string> {
      const appContextStore = useApplicationContextStore();
      const runningInstanceProfileIds = Array.from(appContextStore.activeRuns.values()).map(run => run.launchProfileId);
      return new Set(runningInstanceProfileIds);
    },

    activeLaunchProfiles(): ApplicationLaunchProfile[] {
      const runningIds = this._runningProfileIds;
      return this.allLaunchProfiles.filter(p => p.id !== undefined && runningIds.has(p.id));
    },
    
    inactiveLaunchProfiles(): ApplicationLaunchProfile[] {
      const runningIds = this._runningProfileIds;
      return this.allLaunchProfiles.filter(p => p.id !== undefined && !runningIds.has(p.id));
    },
  }
});
