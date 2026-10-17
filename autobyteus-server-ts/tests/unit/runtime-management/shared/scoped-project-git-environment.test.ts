import {it,expect} from "vitest";
import {scopedProjectGitEnvironment} from "../../../../src/runtime-management/shared/scoped-project-git-environment.js";
it("appends exact child project trust and preserves inherited entries without mutation",()=>{
 const original={GIT_CONFIG_COUNT:"1",GIT_CONFIG_KEY_0:"core.filemode",GIT_CONFIG_VALUE_0:"true",HOME:"/private"};
 expect(scopedProjectGitEnvironment(original,"/shared/a")).toEqual({...original,GIT_CONFIG_COUNT:"2",GIT_CONFIG_KEY_1:"safe.directory",GIT_CONFIG_VALUE_1:"/shared/a"});
 expect(original.GIT_CONFIG_COUNT).toBe("1");
});
it("rejects bad count or nonabsolute project instead of broad trust",()=>{
 expect(()=>scopedProjectGitEnvironment({GIT_CONFIG_COUNT:"-1"},"/shared/a")).toThrow();
 expect(()=>scopedProjectGitEnvironment({},"relative")).toThrow();
});
