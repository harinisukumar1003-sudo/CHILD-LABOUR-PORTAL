package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "rehabilitation_centers")
@Getter @Setter @NoArgsConstructor
public class RehabilitationCenter {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String name;
    @Column(nullable = false, length = 500)
    private String address;
    @Column(nullable = false, length = 120)
    private String contactPerson;
    @Column(nullable = false, length = 30)
    private String contactPhone;
    @Column(nullable = false)
    private Integer capacity;
    @Column(nullable = false, length = 1000)
    private String servicesOffered;
}