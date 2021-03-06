import Vue from "vue";
import { Component, Lifecycle, Watch } from "av-ts";
import * as signalR from "@aspnet/signalr";
import vueSlider from "vue-slider-component";
import Machine from "./Machine";

declare var MachinesAPIBaseUrl : string;

@Component({
    name: "machines-list",
    template: require("./MachinesList.html"),
    components: {
        "vue-slider": vueSlider
    }
})
export default class MachinesList extends Vue {

    private machineHub? : signalR.HubConnection = undefined;

    groups : string[] = [];
    selectedGroup : string = "";
    machines : { [id : string] : Machine[] } = {};
    machinesInSelectedGroup : Machine[] = [];

    @Lifecycle
    created() : void {
        fetch(`${MachinesAPIBaseUrl}/groups`)
            .then(response => response.json() as Promise<string[]>)
            .then(data => {
                this.groups = data;
            });
    }

    @Watch("selectedGroup")
    selectedGroupChanged(newValue : string, oldValue : string)
    {
        fetch(`${MachinesAPIBaseUrl}/${newValue}`)
            .then(response => response.json() as Promise<Machine[]>)
            .then(data => {
                if (!this.machines[newValue])
                    this.machines[newValue] = data.map(d => new Machine(d.group, d.name));

                this.machinesInSelectedGroup = this.machines[newValue];

                if (this.machineHub === undefined) {
                    this.connectToGroup();
                    return; 
                } 
                
                this.machineHub.stop().then(this.connectToGroup);
            });
    }
   
    private connectToGroup() : void {
        this.machineHub = new signalR.HubConnectionBuilder().withUrl(`/hubs/machines?group=${this.selectedGroup}`).withHubProtocol(new signalR.JsonHubProtocol()).build(); 
        this.machineHub.on("NotifyGroup", (group, message) => { (this as any).$toast(`An ${group}: ${message}`) } );
        this.machineHub.on("NotifyAll", (message) => { (this as any).$toast(`An alle: ${message}`) } );
        this.machineHub.on("MachineSpeedReported", (group, name, speed) => {});
        this.machineHub.start().catch(err => alert(err));
    }

}