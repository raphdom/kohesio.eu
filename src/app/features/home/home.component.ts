import {AfterViewInit, Component, ViewChild} from '@angular/core';
import { UxService } from '@eui/core';
import {ProjectService} from "../../project.service";
import { FormGroup, FormBuilder } from '@angular/forms';
import {Project} from "../../shared/models/project.model";
import {Filters} from "../../shared/models/filters.model";
import {MarkerService} from "../module1/marker.service";
import { MatPaginator } from '@angular/material/paginator';
declare let L;

@Component({
    templateUrl: './home.component.html'
})
export class HomeComponent implements AfterViewInit {

    public countries: any[] = [];
    public topics: any[] = [];
    public projects: Project[] = [];
    public myForm: FormGroup;
    public isLoading = false;
    public map;
    public loadedDataPoints = false;
    @ViewChild(MatPaginator) paginator: MatPaginator;

    constructor(private projectService: ProjectService,
                private formBuilder: FormBuilder,
                private uxService:UxService,
                private markerService:MarkerService){}

    ngOnInit(){
        this.myForm = this.formBuilder.group({
            countries: [null],
            topics: [null],
            term: ""
        });
        this.projectService.getFilters().then(result=>{
            //Countries
            for (let country of result.countries){
                let countryCode = country[0].split(",")[1].toLowerCase();
                let countryId= country[0].split(",")[0];
                this.countries.push({
                    id: countryId,
                    value: country[1],
                    iconClass: 'flag-icon flag-icon-' + countryCode
                })
            }
            //Topics
            for (let topic of result.topics){
                let topicCode = topic[0].split(",")[0];
                let topicId= topic[0].split(",")[1];
                this.topics.push({
                    id: topicId,
                    value: topic[1],
                    iconClass: 'topic-icon ' + topicCode
                })
            }
        });
        this.getProjectList(null);
        this.markerService.getServerPoints().then(result=>{
            this.loadedDataPoints = result;
        });
    }

    ngAfterViewInit(): void {
    }

    private getProjectList(filters:Filters){
        this.isLoading = true;
        this.projectService.getProjects(filters).subscribe((result:Project[]) => {
            this.projects = result;
            this.isLoading = false;
            this.paginator.firstPage();
        });
    }

    onSubmit(form: FormGroup) {
        this.projects = [];
        const filters = new Filters().deserialize(form.value);
        this.getProjectList(filters);
    }

    onMapModalAnimationEnd(event){
        if (!this.map) {
            this.map = L.map('map-inside').setView([48, 4], 5);
            const tiles = L.tileLayer('https://europa.eu/webtools/maps/tiles/osmec2/{z}/{x}/{y}', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
                    '| &copy; <a href="https://ec.europa.eu/eurostat/web/gisco">GISCO</a>'
            });
            tiles.addTo(this.map);

            this.markerService.makeMarkers(this.map);
        }
    }

    onPaginate(event){
    }

    getPageIndexStart(){
        return this.paginator ? this.paginator.pageSize * this.paginator.pageIndex : 0;
    }

    getPageIndexEnd(){
        return this.paginator ? this.getPageIndexStart() + this.paginator.pageSize : 15;
    }

}
